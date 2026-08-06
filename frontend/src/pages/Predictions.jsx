import React, { useState } from 'react';
import {
  Container, Grid, Card, CardContent, Typography, Button,
  Box, TextField, Alert, Paper, Chip, Divider, IconButton
} from '@mui/material';
import { AutoFixHigh, Refresh, ContentCopy } from '@mui/icons-material';
import axios from 'axios';

const API_URL = 'http://127.0.0.1:5000/api';

function Predictions() {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [numPredictions, setNumPredictions] = useState(2);

  const generatePredictions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`${API_URL}/predict`, {
        num_predictions: parseInt(numPredictions)
      });
      
      console.log('Resposta da API:', response.data);
      
      // A API pode retornar predictions como objeto OU array
      let preds = response.data.predictions;
      
      // Se for null/undefined, array vazio
      if (!preds) {
        preds = [];
      }
      // Se for objeto (não é array), converte para array
      else if (!Array.isArray(preds)) {
        preds = [preds];
      }
      // Se já for array, mantém
      
      console.log('Predictions processadas:', preds);
      setPredictions(preds);
      
    } catch (err) {
      console.error('Erro ao gerar previsões:', err);
      setError('Erro ao gerar previsões. Verifique se o backend está rodando.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (numbers, stars) => {
    const text = `Números: ${numbers.join(', ')} | Estrelas: ${stars.join(', ')}`;
    navigator.clipboard.writeText(text);
  };

  // Renderização segura - só faz map se for array
  const renderPredictions = () => {
    if (!Array.isArray(predictions) || predictions.length === 0) {
      return (
        <Grid item xs={12}>
          <Alert severity="info">
            Clique em "Gerar Previsões" para começar.
          </Alert>
        </Grid>
      );
    }

    return predictions.map((pred, index) => (
      <Grid item xs={12} md={6} lg={4} key={index}>
        <Card sx={{ height: '100%', bgcolor: 'rgba(25, 118, 210, 0.05)' }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  Previsão #{index + 1}
                </Typography>
                {pred.weekday && (
                  <Typography variant="caption" color="text.secondary">
                    {pred.weekday === 'tuesday' ? 'Terça-feira' : 'Sexta-feira'}
                  </Typography>
                )}
              </Box>
              <IconButton size="small" onClick={() => copyToClipboard(pred.numbers, pred.stars)}>
                <ContentCopy fontSize="small" />
              </IconButton>
            </Box>
            
            <Divider sx={{ mb: 2 }} />
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 'bold', mb: 1 }}>
                Números Principais
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {pred.numbers && Array.isArray(pred.numbers) ? (
                  pred.numbers.map((num) => (
                    <Chip 
                      key={num} 
                      label={num} 
                      sx={{ 
                        width: 50, height: 50, fontSize: '1.2rem',
                        fontWeight: 'bold', bgcolor: 'primary.main', color: 'white'
                      }} 
                    />
                  ))
                ) : (
                  <Typography variant="caption">Números inválidos</Typography>
                )}
              </Box>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="secondary" sx={{ fontWeight: 'bold', mb: 1 }}>
                Estrelas
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {pred.stars && Array.isArray(pred.stars) ? (
                  pred.stars.map((star) => (
                    <Chip 
                      key={star} 
                      label={star} 
                      sx={{ 
                        width: 50, height: 50, fontSize: '1.2rem',
                        fontWeight: 'bold', bgcolor: 'secondary.main', color: 'white'
                      }} 
                    />
                  ))
                ) : (
                  <Typography variant="caption">Estrelas inválidas</Typography>
                )}
              </Box>
            </Box>

            {pred.quantum_qubits && Array.isArray(pred.quantum_qubits) && (
              <Alert severity="info" sx={{ mt: 2, fontSize: '0.75rem' }}>
                <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                  <strong>Estado Quântico (p(1) por qubit):</strong>
                </Typography>
                <Typography variant="caption" sx={{ display: 'block' }}>
                  {pred.quantum_qubits
                    .map((q, i) => `q${i}=${q.p1.toFixed(2)}`)
                    .join(' | ')}
                </Typography>
              </Alert>
            )}
          </CardContent>
        </Card>
      </Grid>
    ));
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h3" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
        🔮 Previsões Quânticas
      </Typography>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            label="Número de previsões"
            type="number"
            value={numPredictions}
            onChange={(e) => setNumPredictions(e.target.value)}
            InputProps={{ inputProps: { min: 1, max: 10 } }}
            size="small"
            sx={{ width: 200 }}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={generatePredictions}
            disabled={loading}
            startIcon={loading ? <Refresh /> : <AutoFixHigh />}
            size="large"
          >
            {loading ? 'Gerando...' : 'Gerar Previsões'}
          </Button>
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Grid container spacing={3}>
        {renderPredictions()}
      </Grid>
    </Container>
  );
}

export default Predictions;