import React, { useState, useEffect } from 'react';
import {
  Container, Grid, Card, CardContent, Typography, Box,
  CircularProgress, Alert, Paper, Chip, Avatar
} from '@mui/material';
import { BarChart, PieChart } from '@mui/x-charts';
import { DataGrid } from '@mui/x-data-grid';import { TrendingUp, History, Star, EmojiEvents } from '@mui/icons-material';
import axios from 'axios';

const API_URL = 'http://127.0.0.1:5000/api';
axios.get(`${API_URL}/analysis`);

function Dashboard() {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const response = await axios.get(`${API_URL}/analysis`);
        setAnalysis(response.data);
        setLoading(false);
      } catch (err) {
        setError('Erro ao carregar dados. Verifique se o backend está rodando.');
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

  const topNumbers = Object.entries(analysis?.most_frequent_numbers || {})
    .slice(0, 10)
    .map(([num, freq]) => ({ number: num, frequency: freq }));

  const pieData = Object.entries(analysis?.most_frequent_stars || {})
    .map(([num, freq]) => ({
      id: num,
      value: freq,
      label: `Estrela ${num}`,
    }));

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h3" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
        📊 Dashboard de Análise EuroMillions
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', mr: 2 }}>
                  <History />
                </Avatar>
                <Typography variant="body2">Total de Sorteios</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {analysis?.total_draws || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'secondary.main', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', mr: 2 }}>
                  <TrendingUp />
                </Avatar>
                <Typography variant="body2">Média Números</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {analysis?.number_mean?.toFixed(2) || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'success.main', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', mr: 2 }}>
                  <Star />
                </Avatar>
                <Typography variant="body2">Números Quentes</Typography>
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {analysis?.hot_numbers?.length || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'info.main', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', mr: 2 }}>
                  <EmojiEvents />
                </Avatar>
                <Typography variant="body2">Top Frequência</Typography>
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {Object.keys(analysis?.most_frequent_numbers || {})[0] || '-'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                🏆 Top 10 Números Mais Frequentes
              </Typography>
              <Box sx={{ height: 400 }}>
                <BarChart
                  xAxis={[{ scaleType: 'band', data: topNumbers.map(n => n.number) }]}
                  series={[{ data: topNumbers.map(n => n.frequency), color: '#1976d2' }]}
                  width={800}
                  height={400}
                  slotProps={{ legend: { hidden: true } }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                ⭐ Distribuição das Estrelas
              </Typography>
              <Box sx={{ height: 400, display: 'flex', justifyContent: 'center' }}>
                <PieChart
                  series={[{
                    data: pieData,
                    innerRadius: 30,
                    outerRadius: 100,
                    paddingAngle: 2,
                    cornerRadius: 5,
                  }]}
                  width={400}
                  height={400}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                🔥 Números Quentes
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {analysis?.hot_numbers?.map((num) => (
                  <Chip key={num} label={num} color="secondary" variant="outlined" />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                ❄️ Números Frios
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {analysis?.cold_numbers?.map((num) => (
                  <Chip key={num} label={num} color="info" variant="outlined" />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                📋 Todas as Frequências
              </Typography>
              <Box sx={{ height: 400 }}>
                <DataGrid
                  rows={Object.entries(analysis?.number_frequencies || {})
                    .map(([num, freq], index) => ({ id: index, number: num, frequency: freq }))}
                  columns={[
                    { field: 'number', headerName: 'Número', width: 150 },
                    { field: 'frequency', headerName: 'Frequência', width: 150 },
                  ]}
                  initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                  pageSizeOptions={[10, 25, 50]}
                  disableRowSelectionOnClick
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