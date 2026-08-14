import React, { useState, useEffect } from "react";
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Paper,
  Tab,
  Tabs,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Divider,
} from "@mui/material";

import { PieChart, LineChart, BarChart } from "@mui/x-charts";
import { DataGrid } from "@mui/x-data-grid";
import { Assessment, TableChart, FilterList, TrendingUp } from "@mui/icons-material";
import axios from "axios";

const API_URL = "http://127.0.0.1:5000/api";

function Analysis() {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  
  // Filtros
  const [selectedNumber, setSelectedNumber] = useState("");
  const [selectedDay, setSelectedDay] = useState("all");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const { data } = await axios.get(`${API_URL}/analysis`);
        console.log("Analysis data:", data);
        setAnalysis(data);
      } catch (err) {
        console.error("Erro ao carregar análise:", err);
        setError("Erro ao carregar análise.");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, []);

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="70vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  // Preparar dados para o gráfico de linha (frequência dos números)
  const lineData = Object.entries(analysis?.number_frequencies ?? {}).map(
    ([num, freq]) => ({
      number: Number(num),
      frequency: Number(freq),
    })
  );

  // Preparar dados para o gráfico de pizza (estrelas)
  const starData = Object.entries(analysis?.star_frequencies ?? {}).map(
    ([num, freq]) => ({
      id: Number(num),
      value: Number(freq),
      label: num,
    })
  );

  // Preparar dados para DataGrid
  const gridRows = Object.entries(analysis?.number_frequencies ?? {}).map(
    ([num, freq], index) => ({
      id: index,
      number: Number(num),
      frequency: Number(freq),
    })
  );

  // Preparar dados para gráfico de barras (top 10 números)
  const top10Numbers = Object.entries(analysis?.number_frequencies ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([num, freq]) => ({
      number: Number(num),
      frequency: Number(freq),
    }));

  // Preparar dados para análise temporal (terça vs sexta)
  const tuesdayData = analysis?.tuesday_analysis?.numbers || {};
  const fridayData = analysis?.friday_analysis?.numbers || {};
  
  const dayComparisonData = Object.keys(tuesdayData)
    .slice(0, 15)
    .map((num) => ({
      number: Number(num),
      tuesday: Number(tuesdayData[num] || 0),
      friday: Number(fridayData[num] || 0),
    }));

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h3" gutterBottom fontWeight="bold">
        📈 Análise de Dados Históricos
      </Typography>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, value) => setTabValue(value)}>
          <Tab icon={<Assessment />} iconPosition="start" label="Estatísticas" />
          <Tab icon={<TrendingUp />} iconPosition="start" label="Análise Temporal" />
          <Tab icon={<FilterList />} iconPosition="start" label="Filtros" />
          <Tab icon={<TableChart />} iconPosition="start" label="Tabelas" />
        </Tabs>
      </Paper>

      {/* TAB 0: ESTATÍSTICAS */}
      {tabValue === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  📊 Estatísticas Gerais
                </Typography>

                <TableContainer>
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell>Total de Sorteios</TableCell>
                        <TableCell align="right">
                          {analysis?.total_draws ?? "N/A"}
                        </TableCell>
                      </TableRow>

                      <TableRow>
                        <TableCell>Números Mais Frequentes</TableCell>
                        <TableCell align="right">
                          {analysis?.most_frequent_numbers
                            ? Object.entries(analysis.most_frequent_numbers)
                                .slice(0, 5)
                                .map(([num, freq]) => `${num} (${freq})`)
                                .join(", ")
                            : "N/A"}
                        </TableCell>
                      </TableRow>

                      <TableRow>
                        <TableCell>Estrelas Mais Frequentes</TableCell>
                        <TableCell align="right">
                          {analysis?.most_frequent_stars
                            ? Object.entries(analysis.most_frequent_stars)
                                .slice(0, 3)
                                .map(([num, freq]) => `${num} (${freq})`)
                                .join(", ")
                            : "N/A"}
                        </TableCell>
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
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  ⭐ Top 5 Estrelas
                </Typography>

                {starData.length > 0 ? (
                  <PieChart
                    width={400}
                    height={300}
                    series={[
                      {
                        data: starData.slice(0, 5),
                      },
                    ]}
                  />
                ) : (
                  <Alert severity="info">Sem dados de estrelas</Alert>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  🏆 Top 10 Números
                </Typography>

                {top10Numbers.length > 0 ? (
                  <BarChart
                    width={500}
                    height={300}
                    xAxis={[{ scaleType: "band", data: top10Numbers.map((d) => d.number.toString()) }]}
                    series={[{ data: top10Numbers.map((d) => d.frequency), label: "Frequência" }]}
                  />
                ) : (
                  <Alert severity="info">Sem dados</Alert>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  📈 Frequência de Todos os Números
                </Typography>

                {lineData.length > 0 ? (
                  <LineChart
                    width={1300}
                    height={400}
                    xAxis={[
                      {
                        scaleType: "point",
                        data: lineData.map((d) => d.number.toString()),
                      },
                    ]}
                    series={[
                      {
                        data: lineData.map((d) => d.frequency),
                        label: "Frequência",
                      },
                    ]}
                  />
                ) : (
                  <Alert severity="info">Sem dados de frequência</Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* TAB 1: ANÁLISE TEMPORAL */}
      {tabValue === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  📅 Comparação: Terça vs Sexta
                </Typography>

                {dayComparisonData.length > 0 ? (
                  <BarChart
                    width={1000}
                    height={400}
                    xAxis={[{ scaleType: "band", data: dayComparisonData.map((d) => d.number.toString()) }]}
                    series={[
                      { data: dayComparisonData.map((d) => d.tuesday), label: "Terça" },
                      { data: dayComparisonData.map((d) => d.friday), label: "Sexta" },
                    ]}
                  />
                ) : (
                  <Alert severity="info">Sem dados de comparação</Alert>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  📊 Análise de Terça-feira
                </Typography>

                <TableContainer>
                  <Table>
                    <TableBody>
                      {Object.entries(analysis?.tuesday_analysis?.numbers || {})
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 10)
                        .map(([num, freq]) => (
                          <TableRow key={num}>
                            <TableCell>Número {num}</TableCell>
                            <TableCell align="right">{freq} vezes</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  📊 Análise de Sexta-feira
                </Typography>

                <TableContainer>
                  <Table>
                    <TableBody>
                      {Object.entries(analysis?.friday_analysis?.numbers || {})
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 10)
                        .map(([num, freq]) => (
                          <TableRow key={num}>
                            <TableCell>Número {num}</TableCell>
                            <TableCell align="right">{freq} vezes</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  🔗 Pares Mais Frequentes
                </Typography>

                {analysis?.most_frequent_pairs && analysis.most_frequent_pairs.length > 0 ? (
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    {analysis.most_frequent_pairs.slice(0, 20).map((pair, idx) => (
                      <Chip
                        key={idx}
                        label={`${pair.pair} (${pair.count}x)`}
                        color="primary"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                ) : (
                  <Alert severity="info">Sem dados de pares</Alert>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  🔢 Trios Mais Frequentes
                </Typography>

                {analysis?.most_frequent_triples && analysis.most_frequent_triples.length > 0 ? (
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    {analysis.most_frequent_triples.slice(0, 10).map((triple, idx) => (
                      <Chip
                        key={idx}
                        label={`${triple.triple} (${triple.count}x)`}
                        color="secondary"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                ) : (
                  <Alert severity="info">Sem dados de trios</Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* TAB 2: FILTROS */}
      {tabValue === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  🔍 Filtrar por Número
                </Typography>

                <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                  <TextField
                    label="Número (1-50)"
                    type="number"
                    value={selectedNumber}
                    onChange={(e) => setSelectedNumber(e.target.value)}
                    InputProps={{ inputProps: { min: 1, max: 50 } }}
                    size="small"
                  />
                  <Button variant="contained" color="primary">
                    Aplicar
                  </Button>
                </Box>

                {selectedNumber && (
                  <Alert severity="info">
                    Filtro por número {selectedNumber}: {analysis?.number_frequencies?.[selectedNumber] || 0} ocorrências
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  📅 Filtrar por Dia da Semana
                </Typography>

                <FormControl fullWidth size="small">
                  <InputLabel>Dia da Semana</InputLabel>
                  <Select
                    value={selectedDay}
                    label="Dia da Semana"
                    onChange={(e) => setSelectedDay(e.target.value)}
                  >
                    <MenuItem value="all">Todos</MenuItem>
                    <MenuItem value="tuesday">Terça-feira</MenuItem>
                    <MenuItem value="friday">Sexta-feira</MenuItem>
                  </Select>
                </FormControl>

                {selectedDay === "tuesday" && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    Análise de Terça-feira carregada
                  </Alert>
                )}
                {selectedDay === "friday" && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    Análise de Sexta-feira carregada
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  📊 Filtrar por Período
                </Typography>

                <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                  <TextField
                    label="Data Inicial"
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    size="small"
                  />
                  <TextField
                    label="Data Final"
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    size="small"
                  />
                  <Button variant="contained" color="primary">
                    Aplicar Filtro
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* TAB 3: TABELAS */}
      {tabValue === 3 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              📋 Frequência dos Números
            </Typography>

            <Box sx={{ height: 500 }}>
              <DataGrid
                rows={gridRows}
                columns={[
                  {
                    field: "number",
                    headerName: "Número",
                    width: 150,
                  },
                  {
                    field: "frequency",
                    headerName: "Frequência",
                    width: 150,
                  },
                ]}
                pageSizeOptions={[10, 25, 50, 100]}
                initialState={{
                  pagination: {
                    paginationModel: {
                      pageSize: 25,
                    },
                  },
                  sorting: {
                    sortModel: [
                      {
                        field: "frequency",
                        sort: "desc",
                      },
                    ],
                  },
                }}
              />
            </Box>
          </CardContent>
        </Card>
      )}
    </Container>
  );
}

export default Analysis;