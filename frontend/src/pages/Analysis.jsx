import React, { useState, useEffect } from 'react';
import {
  Container, Grid, Card, CardContent, Typography, Box,
  CircularProgress, Alert, Table, TableBody, TableCell,
  TableContainer, TableRow, Paper, Tab, Tabs
} from '@mui/material';
import { BarChart, PieChart } from '@mui/x-charts';
import { DataGrid } from '@mui/x-data-grid';
import { Assessment, TableChart, Insights } from '@mui/icons-material';
import axios from 'axios';

const API_URL = 'http://127.0.0.1:5000';

function Analysis() {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const response = await axios.get(`${API_URL}/analysis`);
        setAnalysis(response.data);
        setLoading(false);
      } catch (err) {
        setError('Erro ao carregar análise.');
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  const lineData = Object.entries(analysis?.number_frequencies || {})
    .slice(0, 20)
    .map(([num, freq]) => ({ number: parseInt(num), frequency: freq }));

  const series = [{ data: lineData.map(d => d.frequency), label: 'Frequência' }];

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h3" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
        📈 Análise de Dados Históricos
      </Typography>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab icon={<Assessment />} iconPosition="start" label="Estatísticas" />
          <Tab icon={<TableChart />} iconPosition="start" label="Tabelas" />
        </Tabs>
      </Paper>

      {tabValue === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                  📊 Estatísticas dos Números
                </Typography>
                <TableContainer>
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell><strong>Média:</strong></TableCell>
                        <TableCell align="right">{analysis?.number_mean?.toFixed(2)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><strong>Desvio Padrão:</strong></TableCell>
                        <TableCell align="right">{analysis?.number_std?.toFixed(2)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><strong>Total de Sorteios:</strong></TableCell>
                        <TableCell align="right">{analysis?.total_draws}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                  ⭐ Top 5 Estrelas
                </Typography>
                <Box sx={{ height: 300 }}>
                  <PieChart
                    series={[{
                      data: Object.entries(analysis?.most_frequent_stars || {})
                        .map(([num, freq]) => ({ id: num, value: freq, label: `${num}` })),
                      innerRadius: 50,
                      outerRadius: 100,
                    }]}
                    width={400}
                    height={300}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                  🏆 Top 20 Números
                </Typography>
                <Box sx={{ height: 400 }}>
                  <LineChart
                    xAxis={[{ scaleType: 'point', data: lineData.map(d => d.number) }]}
                    series={series}
                    width={800}
                    height={400}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tabValue === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                  📋 Todas as Frequências
                </Typography>
                <Box sx={{ height: 500 }}>
                  <DataGrid
                    rows={Object.entries(analysis?.number_frequencies || {})
                      .map(([num, freq], index) => ({ 
                        id: index, 
                        number: parseInt(num), 
                        frequency: freq,
                      }))}
                    columns={[
                      { field: 'number', headerName: 'Número', width: 150 },
                      { field: 'frequency', headerName: 'Frequência', width: 150 },
                    ]}
                    initialState={{
                      sorting: { sortModel: [{ field: 'frequency', sort: 'desc' }] },
                      pagination: { paginationModel: { pageSize: 25 } },
                    }}
                    pageSizeOptions={[10, 25, 50, 100]}
                    disableRowSelectionOnClick
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Container>
  );
}

export default Analysis;