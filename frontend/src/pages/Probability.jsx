import React, { useState, useEffect } from 'react';
import {
    Container, Grid, Card, CardContent, Typography, Box,
    CircularProgress, Alert, Paper, Table, TableBody, TableCell,
    TableContainer, TableRow, Chip, Divider, Button
} from '@mui/material';
import { Gauge, gaugeClasses } from '@mui/x-charts';
import { Analytics, AutoFixHigh, Refresh } from '@mui/icons-material';
import axios from 'axios';

const API_URL = 'http://127.0.0.1:5000';

function Probability() {
    const [analysis, setAnalysis] = useState(null);
    const [predictions, setPredictions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        const fetchAnalysis = async () => {
            try {
                const response = await axios.get(`${API_URL}/analysis`);
                setAnalysis(response.data);
                setLoading(false);
            } catch (err) {
                setError('Erro ao carregar análise probabilística.');
                setLoading(false);
            }
        };

        fetchAnalysis();
    }, []);

    const generatePredictions = async () => {
        setGenerating(true);
        try {
            const response = await axios.post(`${API_URL}/predict`, { num_predictions: 5 });
            setPredictions(response.data.predictions);
        } catch (err) {
            setError('Erro ao gerar previsões.');
        } finally {
            setGenerating(false);
        }
    };

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

    const radarData = Object.entries(analysis?.most_frequent_numbers || {})
        .slice(0, 10)
        .map(([num, freq]) => ({ number: num, frequency: freq }));

    const topProbable = Object.entries(analysis?.number_frequencies || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    const calculateProbability = (num) => {
        const freq = analysis?.number_frequencies?.[num] || 0;
        const total = analysis?.total_draws || 1;
        return ((freq / total) * 100).toFixed(2);
    };

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h3" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
                🎯 Análise Probabilística Quântica
            </Typography>

            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', textAlign: 'center' }}>
                                Probabilidade Máxima
                            </Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                                <Gauge
                                    value={parseFloat(calculateProbability(Object.keys(analysis?.most_frequent_numbers || {})[0]))}
                                    startAngle={-90}
                                    endAngle={90}
                                    sx={{ [`& .${gaugeClasses.valueText}`]: { fontSize: 30 } }}
                                    valueText={calculateProbability(Object.keys(analysis?.most_frequent_numbers || {})[0]) + '%'}
                                />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', textAlign: 'center' }}>
                                Previsões Disponíveis
                            </Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={generatePredictions}
                                    disabled={generating}
                                    startIcon={generating ? <Refresh /> : <Analytics />}
                                    size="large"
                                >
                                    {generating ? 'Calculando...' : 'Calcular Agora'}
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', textAlign: 'center' }}>
                                Estado Quântico
                            </Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
                                <AutoFixHigh sx={{ fontSize: 100, color: 'primary.main' }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                                🏆 Top 10 Números Mais Prováveis
                            </Typography>
                            <TableContainer>
                                <Table>
                                    <TableBody>
                                        {topProbable.map(([num, freq], index) => (
                                            <TableRow key={num}>
                                                <TableCell>
                                                    <Chip label={`#${index + 1}`} color={index < 3 ? 'secondary' : 'default'} size="small" />
                                                </TableCell>
                                                <TableCell>
                                                    <Chip label={num} color="primary" sx={{ fontWeight: 'bold' }} />
                                                </TableCell>
                                                <TableCell align="right">{freq} vezes</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

        

            {predictions.length > 0 && (
                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <Card sx={{ bgcolor: 'rgba(25, 118, 210, 0.05)' }}>
                            <CardContent>
                                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                                    🔮 Resultado do Cálculo Quântico
                                </Typography>
                                <Divider sx={{ mb: 2 }} />
                                <Grid container spacing={2}>
                                    {predictions.map((pred, index) => (
                                        <Grid item xs={12} md={6} lg={4} key={index}>
                                            <Paper sx={{ p: 2, textAlign: 'center' }}>
                                                <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                                                    {pred.numbers.join(' - ')}
                                                </Typography>
                                                <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'secondary.main', mt: 1 }}>
                                                    Estrelas: {pred.stars.join(' - ')}
                                                </Typography>
                                            </Paper>
                                        </Grid>
                                    ))}
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}
        </Container>
    );
}

export default Probability;