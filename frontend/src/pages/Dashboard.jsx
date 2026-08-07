import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  Alert,
  AlertTitle,
  Avatar,
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
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';

import {
  AcUnit,
  EmojiEvents,
  History,
  LocalFireDepartment,
  Refresh,
  Star,
  TrendingUp,
} from '@mui/icons-material';

import axios from 'axios';

import { BarChart } from '@mui/x-charts/BarChart';
import { PieChart } from '@mui/x-charts/PieChart';
import { DataGrid } from '@mui/x-data-grid';

import './Dashboard.css';


// =============================================================================
// CONFIGURAÇÃO DA API
// =============================================================================

const API_URL = 'http://127.0.0.1:5000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    Accept: 'application/json',
  },
});


// =============================================================================
// FUNÇÕES AUXILIARES
// =============================================================================

function safeObject(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
  )
    ? value
    : {};
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function toNumber(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number) ? number : fallback;
}

function getErrorMessage(error) {
  if (error.response) {
    const status = error.response.status;

    const backendMessage =
      error.response.data?.error ||
      error.response.data?.message ||
      'Sem detalhes adicionais.';

    return `Erro ${status}: ${backendMessage}`;
  }

  if (error.code === 'ECONNABORTED') {
    return 'O backend demorou demasiado tempo a responder.';
  }

  if (error.request) {
    return (
      `Não foi possível ligar ao backend em ${API_URL}. ` +
      'Verifique se o Flask está ativo e se o CORS está configurado.'
    );
  }

  return error.message || 'Ocorreu um erro inesperado.';
}


// =============================================================================
// CARTÃO DE INDICADOR
// =============================================================================

function MetricCard({
  icon,
  title,
  value,
  color,
}) {
  return (
    <Card
      className="metric-card"
      elevation={3}
      sx={{ bgcolor: color }}
    >
      <CardContent className="metric-card__content">
        <Box className="metric-card__header">
          <Avatar className="metric-card__avatar">
            {icon}
          </Avatar>

          <Typography
            variant="body2"
            className="metric-card__label"
          >
            {title}
          </Typography>
        </Box>

        <Typography
          variant="h4"
          className="metric-card__value"
        >
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}


// =============================================================================
// LISTA DE PARES E TRIOS
// =============================================================================

function CombinationList({
  items,
  field,
  color,
}) {
  if (items.length === 0) {
    return (
      <Typography color="text.secondary">
        Não existem dados disponíveis.
      </Typography>
    );
  }

  return (
    <Box className="combination-list">
      {items.slice(0, 10).map((item, index) => (
        <Box
          key={`${field}-${item[field]}-${index}`}
          className="combination-item"
        >
          <Typography className="combination-item__name">
            {item[field]}
          </Typography>

          <Chip
            size="small"
            label={`${toNumber(item.count)} vezes`}
            color={color}
            variant="outlined"
          />
        </Box>
      ))}
    </Box>
  );
}


// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

function Dashboard() {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  // ---------------------------------------------------------------------------
  // Carregar análise do backend
  // ---------------------------------------------------------------------------

  const loadAnalysis = useCallback(async (manualRefresh = false) => {
    try {
      setError('');

      if (manualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await api.get('/analysis');

      if (
        !response.data ||
        typeof response.data !== 'object'
      ) {
        throw new Error(
          'Resposta inválida recebida do backend.'
        );
      }

      setAnalysis(response.data);
      setLastUpdated(new Date());
    } catch (requestError) {
      console.error(
        'Erro ao carregar análise:',
        requestError
      );

      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAnalysis();
  }, [loadAnalysis]);

  // ---------------------------------------------------------------------------
  // Campos recebidos do seu backend
  // ---------------------------------------------------------------------------

  const numberFrequencies = useMemo(() => {
    return safeObject(analysis?.number_frequencies);
  }, [analysis]);

  const starFrequencies = useMemo(() => {
    return safeObject(analysis?.star_frequencies);
  }, [analysis]);

  const frequentPairs = useMemo(() => {
    return safeArray(analysis?.most_frequent_pairs);
  }, [analysis]);

  const frequentTriples = useMemo(() => {
    return safeArray(analysis?.most_frequent_triples);
  }, [analysis]);

  const tuesdayNumbers = useMemo(() => {
    return safeObject(
      analysis?.tuesday_analysis?.numbers
    );
  }, [analysis]);

  const fridayNumbers = useMemo(() => {
    return safeObject(
      analysis?.friday_analysis?.numbers
    );
  }, [analysis]);

  // ---------------------------------------------------------------------------
  // Criar lista completa dos números 1 a 50
  // ---------------------------------------------------------------------------

  const allNumbers = useMemo(() => {
    return Array.from({ length: 50 }, (_, index) => {
      const number = index + 1;

      return {
        number,
        frequency: toNumber(
          numberFrequencies[number]
        ),
      };
    });
  }, [numberFrequencies]);

  // ---------------------------------------------------------------------------
  // Números quentes
  // ---------------------------------------------------------------------------

  const hotNumbers = useMemo(() => {
    return [...allNumbers]
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10)
      .map((item) => item.number);
  }, [allNumbers]);

  // ---------------------------------------------------------------------------
  // Números frios
  // ---------------------------------------------------------------------------

  const coldNumbers = useMemo(() => {
    return [...allNumbers]
      .sort((a, b) => a.frequency - b.frequency)
      .slice(0, 10)
      .map((item) => item.number);
  }, [allNumbers]);

  // ---------------------------------------------------------------------------
  // Média ponderada dos números
  // ---------------------------------------------------------------------------

  const numberMean = useMemo(() => {
    const totalOccurrences = allNumbers.reduce(
      (total, item) => total + item.frequency,
      0
    );

    if (totalOccurrences === 0) {
      return 0;
    }

    const weightedSum = allNumbers.reduce(
      (total, item) =>
        total + item.number * item.frequency,
      0
    );

    return weightedSum / totalOccurrences;
  }, [allNumbers]);

  // ---------------------------------------------------------------------------
  // Top números para o gráfico
  // ---------------------------------------------------------------------------

  const topNumbers = useMemo(() => {
    return [...allNumbers]
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 15);
  }, [allNumbers]);

  // ---------------------------------------------------------------------------
  // Dados das estrelas para o PieChart
  // ---------------------------------------------------------------------------

  const starsData = useMemo(() => {
    const colors = [
      '#1976d2',
      '#9c27b0',
      '#2e7d32',
      '#ed6c02',
      '#0288d1',
      '#d81b60',
      '#7b1fa2',
      '#388e3c',
      '#f57c00',
      '#c2185b',
      '#303f9f',
      '#00796b',
    ];

    return Object.entries(starFrequencies)
      .map(([number, frequency], index) => ({
        id: number,
        label: `Estrela ${number}`,
        value: toNumber(frequency),
        color: colors[index % colors.length],
      }))
      .filter((item) => item.value > 0);
  }, [starFrequencies]);

  // ---------------------------------------------------------------------------
  // Dados de terça-feira e sexta-feira
  // ---------------------------------------------------------------------------

  const weekdayChart = useMemo(() => {
    const numbers = Array.from(
      { length: 50 },
      (_, index) => index + 1
    );

    return {
      numbers,

      tuesday: numbers.map((number) =>
        toNumber(tuesdayNumbers[number])
      ),

      friday: numbers.map((number) =>
        toNumber(fridayNumbers[number])
      ),
    };
  }, [tuesdayNumbers, fridayNumbers]);

  // ---------------------------------------------------------------------------
  // Dados da tabela
  // ---------------------------------------------------------------------------

  const tableRows = useMemo(() => {
    return allNumbers
      .map((item) => {
        const isHot = hotNumbers.includes(item.number);
        const isCold = coldNumbers.includes(item.number);

        return {
          id: item.number,
          number: item.number,
          frequency: item.frequency,
          status: isHot
            ? 'Quente'
            : isCold
              ? 'Frio'
              : 'Neutro',
        };
      })
      .sort((a, b) => b.frequency - a.frequency);
  }, [
    allNumbers,
    hotNumbers,
    coldNumbers,
  ]);

  // ---------------------------------------------------------------------------
  // Loading inicial
  // ---------------------------------------------------------------------------

  if (loading && !analysis) {
    return (
      <Box className="dashboard-loading">
        <CircularProgress />

        <Typography color="text.secondary">
          A carregar análise do backend...
        </Typography>
      </Box>
    );
  }

  // ---------------------------------------------------------------------------
  // Erro inicial
  // ---------------------------------------------------------------------------

  if (error && !analysis) {
    return (
      <Container
        maxWidth={false}
        disableGutters
        className="dashboard-page"
      >
        <Alert
          severity="error"
          action={
            <Button
              color="inherit"
              size="small"
              startIcon={<Refresh />}
              onClick={() => loadAnalysis(true)}
            >
              Tentar novamente
            </Button>
          }
        >
          <AlertTitle>
            Não foi possível carregar a análise
          </AlertTitle>

          {error}

          <Typography
            variant="body2"
            sx={{ mt: 1 }}
          >
            O backend precisa ter um CSV carregado antes
            de responder à rota <strong>/analysis</strong>.
          </Typography>
        </Alert>
      </Container>
    );
  }

  // ---------------------------------------------------------------------------
  // Renderização
  // ---------------------------------------------------------------------------

  return (
    <Container
      maxWidth={false}
      disableGutters
      className="dashboard-page"
    >
      {/* Cabeçalho */}
      <Stack className="dashboard-header">
        <Box>
          <Typography
            variant="h3"
            className="dashboard-header__title"
          >
             Dashboard
          </Typography>

      

          {lastUpdated && (
            <Typography
              variant="caption"
              className="dashboard-header__updated"
            >
              Última atualização:{' '}
              {lastUpdated.toLocaleString('pt-PT')}
            </Typography>
          )}
        </Box>

        <Tooltip title="Atualizar dados">
          <span>
            <IconButton
              className="dashboard-refresh-button"
              color="primary"
              onClick={() => loadAnalysis(true)}
              disabled={refreshing}
            >
              {refreshing ? (
                <CircularProgress size={22} />
              ) : (
                <Refresh />
              )}
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      {/* Erro durante atualização */}
      {error && analysis && (
        <Alert
          severity="warning"
          className="dashboard-alert"
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => loadAnalysis(true)}
            >
              Repetir
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* Indicadores */}
      <Grid
        container
        spacing={3}
        sx={{ mb: 4 }}
      >
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            icon={<History />}
            title="Total de Sorteios"
            value={toNumber(analysis?.total_draws)}
            color="primary.main"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            icon={<TrendingUp />}
            title="Média dos Números"
            value={numberMean.toFixed(2)}
            color="secondary.main"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            icon={<Star />}
            title="Números Quentes"
            value={hotNumbers.length}
            color="error.main"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            icon={<EmojiEvents />}
            title="Número Mais Frequente"
            value={hotNumbers[0] || '-'}
            color="success.main"
          />
        </Grid>
      </Grid>

      {/* Conteúdo */}
      <Grid container spacing={3}>
        {/* Top números */}
        <Grid item xs={12} lg={8}>
          <Card
            className="dashboard-card dashboard-card--hover"
            elevation={2}
          >
            <CardContent>
              <Typography
                variant="h6"
                className="dashboard-card__title"
              >
                 Top 15 Números Mais Frequentes
              </Typography>

              <Typography
                variant="body2"
                className="dashboard-card__subtitle"
              >
                Dados provenientes de number_frequencies.
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Box className="chart-wrapper chart-wrapper--large">
                <BarChart
                  xAxis={[
                    {
                      scaleType: 'band',
                      data: topNumbers.map((item) =>
                        String(item.number)
                      ),
                      label: 'Número',
                    },
                  ]}
                  yAxis={[
                    {
                      label: 'Frequência',
                    },
                  ]}
                  series={[
                    {
                      data: topNumbers.map(
                        (item) => item.frequency
                      ),
                      label: 'Frequência',
                      color: '#1976d2',
                    },
                  ]}
                  width={1050}
                  height={400}
                  grid={{ horizontal: true }}
                  borderRadius={6}
                  slotProps={{
                    legend: {
                      hidden: true,
                    },
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Estrelas */}
        <Grid item xs={12} lg={4}>
          <Card
            className="dashboard-card dashboard-card--hover"
            elevation={2}
          >
            <CardContent>
              <Typography
                variant="h6"
                className="dashboard-card__title"
              >
                Distribuição das Estrelas
              </Typography>

              <Typography
                variant="body2"
                className="dashboard-card__subtitle"
              >
                Dados provenientes de star_frequencies.
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Box className="chart-wrapper chart-wrapper--pie">
                <PieChart
                  series={[
                    {
                      data: starsData,
                      innerRadius: 40,
                      outerRadius: 110,
                      paddingAngle: 2,
                      cornerRadius: 5,
                    },
                  ]}
                  width={750}
                  height={350}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Comparação por dia */}
        <Grid item xs={12}>
          <Card
            className="dashboard-card dashboard-card--hover"
            elevation={2}
          >
            <CardContent>
              <Typography
                variant="h6"
                className="dashboard-card__title"
              >
                📅 Frequência por Dia da Semana
              </Typography>

              <Typography
                variant="body2"
                className="dashboard-card__subtitle"
              >
                Comparação entre terça-feira e sexta-feira.
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Box className="chart-wrapper chart-wrapper--large">
                <BarChart
                  xAxis={[
                    {
                      scaleType: 'band',
                      data: weekdayChart.numbers.map(String),
                      label: 'Número',
                    },
                  ]}
                  yAxis={[
                    {
                      label: 'Frequência',
                    },
                  ]}
                  series={[
                    {
                      data: weekdayChart.tuesday,
                      label: 'Terça-feira',
                      color: '#9c27b0',
                    },
                    {
                      data: weekdayChart.friday,
                      label: 'Sexta-feira',
                      color: '#0288d1',
                    },
                  ]}
                  width={1050}
                  height={420}
                  grid={{ horizontal: true }}
                  borderRadius={4}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Números quentes */}
        <Grid item xs={12} md={6}>
          <Card
            className="dashboard-card dashboard-card--hover"
            elevation={2}
          >
            <CardContent>
              <Typography
                variant="h6"
                className="dashboard-card__title"
              >
                🔥 Números Quentes
              </Typography>

              <Typography
                variant="body2"
                className="dashboard-card__subtitle"
              >
                Os 10 números com maior frequência histórica.
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Box className="number-chips">
                {hotNumbers.map((number) => (
                  <Chip
                    key={`hot-${number}`}
                    className="number-chip"
                    label={number}
                    color="error"
                    variant="outlined"
                    icon={<LocalFireDepartment />}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Números frios */}
        <Grid item xs={12} md={6}>
          <Card
            className="dashboard-card dashboard-card--hover"
            elevation={2}
          >
            <CardContent>
              <Typography
                variant="h6"
                className="dashboard-card__title"
              >
                ❄️ Números Frios
              </Typography>

              <Typography
                variant="body2"
                className="dashboard-card__subtitle"
              >
                Os 10 números com menor frequência histórica.
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Box className="number-chips">
                {coldNumbers.map((number) => (
                  <Chip
                    key={`cold-${number}`}
                    className="number-chip"
                    label={number}
                    color="info"
                    variant="outlined"
                    icon={<AcUnit />}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Pares */}
        <Grid item xs={12} md={6}>
          <Card
            className="dashboard-card dashboard-card--hover"
            elevation={2}
          >
            <CardContent>
              <Typography
                variant="h6"
                className="dashboard-card__title"
              >
                👥 Pares Mais Frequentes
              </Typography>

              <Divider sx={{ my: 2 }} />

              <CombinationList
                items={frequentPairs}
                field="pair"
                color="primary"
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Trios */}
        <Grid item xs={12} md={6}>
          <Card
            className="dashboard-card dashboard-card--hover"
            elevation={2}
          >
            <CardContent>
              <Typography
                variant="h6"
                className="dashboard-card__title"
              >
                🔺 Trios Mais Frequentes
              </Typography>

              <Divider sx={{ my: 2 }} />

              <CombinationList
                items={frequentTriples}
                field="triple"
                color="secondary"
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Tabela */}
        <Grid item xs={12}>
          <Card
            className="dashboard-card dashboard-card--hover"
            elevation={2}
          >
            <CardContent>
              <Typography
                variant="h6"
                className="dashboard-card__title"
              >
                📋 Todas as Frequências
              </Typography>

              <Typography
                variant="body2"
                className="dashboard-card__subtitle"
              >
                Números de 1 a 50, incluindo frequências iguais a zero.
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Box className="dashboard-table">
                <DataGrid
                  rows={tableRows}
                  columns={[
                    {
                      field: 'number',
                      headerName: 'Número',
                      type: 'number',
                      minWidth: 130,
                      flex: 1,
                    },
                    {
                      field: 'frequency',
                      headerName: 'Frequência',
                      type: 'number',
                      minWidth: 150,
                      flex: 1,
                    },
                    {
                      field: 'status',
                      headerName: 'Estado',
                      minWidth: 150,
                      flex: 1,
                      renderCell: (params) => {
                        const color =
                          params.value === 'Quente'
                            ? 'error'
                            : params.value === 'Frio'
                              ? 'info'
                              : 'default';

                        return (
                          <Chip
                            label={params.value}
                            color={color}
                            size="small"
                            variant="outlined"
                          />
                        );
                      },
                    },
                  ]}
                  pageSizeOptions={[10, 25, 50]}
                  disableRowSelectionOnClick
                  initialState={{
                    pagination: {
                      paginationModel: {
                        page: 0,
                        pageSize: 10,
                      },
                    },
                    sorting: {
                      sortModel: [
                        {
                          field: 'frequency',
                          sort: 'desc',
                        },
                      ],
                    },
                  }}
                  localeText={{
                    noRowsLabel: 'Nenhum dado encontrado',
                    noResultsOverlayLabel:
                      'Nenhum resultado encontrado',
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}

export default Dashboard;