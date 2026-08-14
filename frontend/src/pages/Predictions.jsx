import React, { useMemo, useState } from 'react';

import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Grid,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';

import {
  AutoFixHigh,
  ContentCopy,
  Refresh,
  Science,
  TrendingUp,
} from '@mui/icons-material';

import axios from 'axios';

import './Predictions.css';


// =============================================================================
// CONFIGURAÇÃO
// =============================================================================

const API_URL = 'http://127.0.0.1:5000/api';

const TOTAL_COMBINATIONS = 139_838_160;

const JACKPOT_LABEL = '1 em 139.838.160';

const JACKPOT_PERCENT =
  (1 / TOTAL_COMBINATIONS) * 100;

const api = axios.create({
  baseURL: API_URL,
  timeout: 120000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});


// =============================================================================
// FUNÇÕES AUXILIARES
// =============================================================================

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeObject(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
  )
    ? value
    : {};
}

function toNumber(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

function getErrorMessage(error) {
  if (error.response) {
    const backendMessage =
      error.response.data?.error ||
      error.response.data?.message ||
      'Sem detalhes adicionais.';

    return `Erro ${error.response.status}: ${backendMessage}`;
  }

  if (error.code === 'ECONNABORTED') {
    return (
      'A simulação demorou demasiado tempo. ' +
      'Tente reduzir os shots quânticos ou os candidatos.'
    );
  }

  if (error.request) {
    return (
      `Não foi possível ligar ao backend em ${API_URL}. ` +
      'Confirme se o Flask está ativo e se o CORS está configurado.'
    );
  }

  return (
    error.message ||
    'Erro inesperado ao executar a simulação.'
  );
}


// =============================================================================
// CARTÃO DE MÉTRICA
// =============================================================================

function ResultMetric({
  label,
  value,
  color = 'primary',
}) {
  return (
    <Card
      className="predictions-metric"
      variant="outlined"
    >
      <CardContent>
        <Typography
          variant="body2"
          color="text.secondary"
          gutterBottom
        >
          {label}
        </Typography>

        <Typography
          variant="h5"
          className="predictions-metric__value"
          color={`${color}.main`}
        >
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}


// =============================================================================
// CARTÃO DE COMBINAÇÃO
// =============================================================================

function CombinationCard({
  combination,
  onCopy,
}) {
  const numbers = safeArray(
    combination?.numbers
  );

  const stars = safeArray(
    combination?.stars
  );

  const relativeIndex = toNumber(
    combination?.relative_model_index ??
    combination?.relative_score_percent
  );

  const finalScore = toNumber(
    combination?.final_score ??
    combination?.model_score
  );

  const confidenceBand =
    combination?.model_confidence_band ||
    'Sem classificação';

  const bandColor =
    relativeIndex >= 95
      ? 'success'
      : relativeIndex >= 90
      ? 'warning'
      : 'default';

  return (
    <Card
      className="combination-card"
      elevation={3}
    >
      <CardContent>
        <Box className="combination-card__header">
          <Box>
            <Typography
              variant="h6"
              className="combination-card__title"
            >
              Ranking #{combination?.rank || '-'}
            </Typography>

            <Typography
              variant="body2"
              className="combination-card__subtitle"
            >
              Índice relativo:{' '}
              {relativeIndex.toFixed(2)}
              %
            </Typography>

            <Chip
              size="small"
              label={`Faixa ${confidenceBand}`}
              color={bandColor}
              variant="outlined"
              sx={{ mt: 1 }}
            />
          </Box>

          <Tooltip title="Copiar combinação">
            <IconButton
              size="small"
              color="primary"
              onClick={() =>
                onCopy(numbers, stars)
              }
            >
              <ContentCopy fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        <Divider sx={{ mb: 2 }} />

        <Typography
          variant="subtitle2"
          color="primary"
          className="combination-card__section-title"
        >
          Números principais
        </Typography>

        <Box className="combination-card__numbers">
          {numbers.map((number) => (
            <Chip
              key={`number-${number}`}
              label={number}
              className="combination-number"
            />
          ))}
        </Box>

        <Typography
          variant="subtitle2"
          color="secondary"
          className="combination-card__section-title"
        >
          Estrelas
        </Typography>

        <Box className="combination-card__stars">
          {stars.map((star) => (
            <Chip
              key={`star-${star}`}
              label={star}
              className="combination-star"
            />
          ))}
        </Box>

        <Alert
          severity="info"
          icon={false}
        >
          Score final do modelo:{' '}
          {finalScore.toFixed(8)}
        </Alert>

        <Typography
          variant="caption"
          className="combination-card__note"
        >
          O índice relativo serve apenas para ordenar
          candidatos. Não representa probabilidade real
          de acerto.
        </Typography>

        <Typography
          variant="caption"
          display="block"
          color="text.secondary"
          sx={{ mt: 1 }}
        >
          Probabilidade real:{' '}
          <strong>{JACKPOT_LABEL}</strong>
        </Typography>
      </CardContent>
    </Card>
  );
}


// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

function Predictions() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const [
    quantumShots,
    setQuantumShots,
  ] = useState(10000);

  const [topK, setTopK] = useState(20);

  const [
    candidateCount,
    setCandidateCount,
  ] = useState(5000);

  const [
    randomSeed,
    setRandomSeed,
  ] = useState(42);

  // ---------------------------------------------------------------------------
  // Executar modo quântico experimental
  // ---------------------------------------------------------------------------

  const generateSimulation = async () => {
    try {
      setLoading(true);
      setError('');
      setReport(null);
      setCopied(false);

      const payload = {
        top_k: Math.min(
          Math.max(Number(topK) || 10, 1),
          100
        ),

        quantum_shots: Math.min(
          Math.max(
            Number(quantumShots) || 1000,
            1000
          ),
          100000
        ),

        candidate_count: Math.min(
          Math.max(
            Number(candidateCount) || 5000,
            100
          ),
          100000
        ),

        random_seed:
          randomSeed === ''
            ? null
            : Number(randomSeed),

        weekday: 'friday',
      };

      console.log(
        'Payload enviado:',
        payload
      );

      const response = await api.post(
        '/quantum-experimental',
        payload
      );

      console.log(
        'Resposta recebida:',
        response.data
      );

      if (
        !response.data ||
        typeof response.data !== 'object'
      ) {
        throw new Error(
          'O backend devolveu uma resposta inválida.'
        );
      }

      setReport(response.data);
    } catch (requestError) {
      console.error(
        'Erro ao executar simulação:',
        requestError
      );

      setError(
        getErrorMessage(requestError)
      );
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Copiar combinação
  // ---------------------------------------------------------------------------

  const copyToClipboard = async (
    numbers,
    stars
  ) => {
    const text =
      `Números: ${numbers.join(', ')} | ` +
      `Estrelas: ${stars.join(', ')}`;

    try {
      await navigator.clipboard.writeText(text);

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2500);
    } catch (clipboardError) {
      console.error(
        'Erro ao copiar combinação:',
        clipboardError
      );

      setError(
        'Não foi possível copiar a combinação.'
      );
    }
  };

  // ---------------------------------------------------------------------------
  // Dados da resposta do backend
  // ---------------------------------------------------------------------------

  const combinations = useMemo(() => {
    return safeArray(
      report?.ranked_results ||
      report?.ranked_combinations
    );
  }, [report]);

  const quantumInfo = useMemo(() => {
    return safeObject(report?.quantum);
  }, [report]);

  const modelInfo = useMemo(() => {
    return safeObject(report?.model);
  }, [report]);

  const simulationInfo = useMemo(() => {
    return safeObject(report?.simulation);
  }, [report]);

  const odds = useMemo(() => {
    return safeObject(report?.odds);
  }, [report]);

  const backtest = report?.backtest || null;

  // ---------------------------------------------------------------------------
  // Renderização
  // ---------------------------------------------------------------------------

  return (
    <Container
      maxWidth={false}
      disableGutters
      className="predictions-page"
    >
      {/* Cabeçalho */}
      <Stack className="predictions-header">
        <Box>
          <Typography
            variant="h3"
            className="predictions-title"
          >
            🔬 Modo Quântico Experimental
          </Typography>

          <Typography
            variant="body2"
            className="predictions-subtitle"
          >
            Candidatos gerados por amostragem quântica
            e ordenados por score estatístico.
          </Typography>
        </Box>

        <Button
          className="predictions-action"
          variant="contained"
          color="primary"
          size="large"
          startIcon={
            loading ? (
              <CircularProgress
                size={20}
                color="inherit"
              />
            ) : (
              <AutoFixHigh />
            )
          }
          onClick={generateSimulation}
          disabled={loading}
        >
          {loading
            ? 'A executar circuito...'
            : 'Executar simulação'}
        </Button>
      </Stack>

      {/* Configuração */}
      <Paper
        className="predictions-config"
        elevation={2}
      >
        <Typography
          variant="h6"
          className="predictions-config__title"
        >
          <Science color="primary" />
          Parâmetros quânticos
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Shots quânticos"
              type="number"
              value={quantumShots}
              onChange={(event) =>
                setQuantumShots(
                  event.target.value
                )
              }
              helperText="Entre 1.000 e 100.000"
              inputProps={{
                min: 1000,
                max: 100000,
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Resultados exibidos"
              type="number"
              value={topK}
              onChange={(event) =>
                setTopK(event.target.value)
              }
              helperText="Entre 1 e 100"
              inputProps={{
                min: 1,
                max: 100,
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Candidatos"
              type="number"
              value={candidateCount}
              onChange={(event) =>
                setCandidateCount(
                  event.target.value
                )
              }
              helperText="Entre 100 e 100.000"
              inputProps={{
                min: 100,
                max: 100000,
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Seed aleatória"
              type="number"
              value={randomSeed}
              onChange={(event) =>
                setRandomSeed(
                  event.target.value
                )
              }
              helperText="Opcional"
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Erro */}
      {error && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          action={
            <IconButton
              color="inherit"
              size="small"
              onClick={generateSimulation}
            >
              <Refresh fontSize="small" />
            </IconButton>
          }
        >
          <AlertTitle>
            Erro ao executar a simulação
          </AlertTitle>

          {error}
        </Alert>
      )}

      {/* Copiado */}
      {copied && (
        <Alert
          severity="success"
          sx={{ mb: 3 }}
        >
          Combinação copiada para a área de transferência.
        </Alert>
      )}

      {/* Estado inicial */}
      {!report && !loading && !error && (
        <Alert
          severity="info"
          sx={{ mb: 3 }}
        >
          Clique em “Executar simulação” para iniciar
          o modo quântico experimental.
        </Alert>
      )}

      {/* Loading */}
      {loading && (
        <Box className="predictions-loading">
          <CircularProgress />

          <Typography color="text.secondary">
            A executar o circuito quântico e a gerar
            candidatos...
          </Typography>
        </Box>
      )}

      {/* Resultados */}
      {report && !loading && (
        <>
          <Typography
            variant="h5"
            sx={{
              mb: 2,
              fontWeight: 700,
            }}
          >
            📊 Resumo do modo quântico
          </Typography>

          <Grid
            container
            spacing={2}
            sx={{ mb: 4 }}
          >
            <Grid item xs={12} sm={6} md={3}>
              <ResultMetric
                label="Qubits dos números"
                value={toNumber(
                  quantumInfo.number_qubits
                )}
                color="primary"
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <ResultMetric
                label="Qubits das estrelas"
                value={toNumber(
                  quantumInfo.star_qubits
                )}
                color="secondary"
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <ResultMetric
                label="Shots executados"
                value={toNumber(
                  quantumInfo.shots_numbers
                ).toLocaleString('pt-PT')}
                color="success"
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <ResultMetric
                label="Candidatos únicos"
                value={toNumber(
                  quantumInfo.unique_candidates
                ).toLocaleString('pt-PT')}
                color="warning"
              />
            </Grid>
          </Grid>

          {/* Informação da simulação */}
          <Card
            variant="outlined"
            sx={{
              mb: 4,
              borderRadius: 3,
            }}
          >
            <CardContent>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  mb: 2,
                }}
              >
                ⚙️ Informação da simulação
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    Sorteios analisados
                  </Typography>

                  <Typography fontWeight={700}>
                    {toNumber(
                      modelInfo.total_draws
                    ).toLocaleString('pt-PT')}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    Dia utilizado
                  </Typography>

                  <Typography fontWeight={700}>
                    {simulationInfo.weekday === 'tuesday'
                      ? 'Terça-feira'
                      : 'Sexta-feira'}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    Candidatos solicitados
                  </Typography>

                  <Typography fontWeight={700}>
                    {toNumber(
                      modelInfo.candidate_count
                    ).toLocaleString('pt-PT')}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    Dados físicos usados
                  </Typography>

                  <Typography fontWeight={700}>
                    {simulationInfo.physical_data_used
                      ? 'Sim'
                      : 'Não'}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Ranking */}
          <Box
            sx={{
              display: 'flex',
              alignItems: {
                xs: 'flex-start',
                sm: 'center',
              },
              justifyContent: 'space-between',
              flexDirection: {
                xs: 'column',
                sm: 'row',
              },
              gap: 2,
              mb: 2,
            }}
          >
            <Typography
              variant="h5"
              sx={{ fontWeight: 700 }}
            >
              🏆 Candidatos quânticos ranqueados
            </Typography>

            <Chip
              icon={<TrendingUp />}
              label={`${combinations.length} candidatos`}
              color="primary"
              variant="outlined"
            />
          </Box>

          {combinations.length === 0 ? (
            <Alert
              severity="warning"
              sx={{ mb: 4 }}
            >
              O backend respondeu, mas não devolveu
              combinações válidas.
            </Alert>
          ) : (
            <Grid
              container
              spacing={3}
              sx={{ mb: 4 }}
            >
              {combinations.map((combination) => (
                <Grid
                  item
                  xs={12}
                  sm={6}
                  lg={4}
                  xl={3}
                  key={`${combination.rank}-${safeArray(
                    combination.numbers
                  ).join('-')}`}
                >
                  <CombinationCard
                    combination={combination}
                    onCopy={copyToClipboard}
                  />
                </Grid>
              ))}
            </Grid>
          )}

          {/* Backtesting */}
          <Typography
            variant="h5"
            sx={{
              mb: 2,
              fontWeight: 700,
            }}
          >
            🧪 Resultado do backtesting
          </Typography>

          {!backtest ? (
            <Alert
              severity="info"
              sx={{ mb: 4 }}
            >
              A rota{' '}
              <strong>
                /quantum-experimental
              </strong>{' '}
              gera candidatos quânticos, mas não devolve
              backtesting nesta versão.
            </Alert>
          ) : !backtest.available ? (
            <Alert
              severity="warning"
              sx={{ mb: 4 }}
            >
              {backtest.message ||
                'Não foi possível executar o backtesting.'}
            </Alert>
          ) : (
            <Grid
              container
              spacing={2}
              sx={{ mb: 4 }}
            >
              <Grid item xs={12} sm={6} md={3}>
                <ResultMetric
                  label="Sorteios de teste"
                  value={toNumber(
                    backtest.test_draws
                  )}
                  color="primary"
                />
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <ResultMetric
                  label="Média de números"
                  value={toNumber(
                    backtest.average_number_hits
                  ).toFixed(2)}
                  color="success"
                />
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <ResultMetric
                  label="Média de estrelas"
                  value={toNumber(
                    backtest.average_star_hits
                  ).toFixed(2)}
                  color="secondary"
                />
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <ResultMetric
                  label="Média total de acertos"
                  value={toNumber(
                    backtest.average_total_hits
                  ).toFixed(2)}
                  color="warning"
                />
              </Grid>
            </Grid>
          )}

          {/* Probabilidade real */}
          <Alert
            severity="info"
            className="odds-alert"
            icon={<Science />}
          >
            <AlertTitle className="odds-alert__title">
              Probabilidade matemática real
            </AlertTitle>

            Cada combinação possui exatamente{' '}
            <strong className="odds-highlight">
              {odds.jackpot || JACKPOT_LABEL}
            </strong>{' '}
            de probabilidade de acertar o jackpot.

            <br />

            Isso corresponde a aproximadamente{' '}
            <strong className="odds-highlight">
              {JACKPOT_PERCENT.toFixed(9)}%
            </strong>
            .

            <br />

            O índice relativo e o score estatístico apenas
            ordenam os candidatos. Eles não alteram a
            probabilidade matemática do sorteio.
          </Alert>
        </>
      )}
    </Container>
  );
}

export default Predictions;