import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box, IconButton } from '@mui/material';
import { Link } from 'react-router-dom';
import { AutoFixHigh, Analytics, Dashboard, Assessment, EmojiEvents } from '@mui/icons-material';

function Navbar() {
    return (
        <AppBar position="static" elevation={2}>
            <Toolbar>
                <IconButton color="inherit" component={Link} to="/" sx={{ mr: 2 }}>
                    <EmojiEvents />
                </IconButton>
                <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
                    Quantum Lottery Agent
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button color="inherit" component={Link} to="/">
                        <Dashboard sx={{ mr: 1 }} /> Dashboard
                    </Button>
                    <Button color="inherit" component={Link} to="/predictions">
                        <AutoFixHigh sx={{ mr: 1 }} /> Previsões
                    </Button>
                    <Button color="inherit" component={Link} to="/analysis">
                        <Assessment sx={{ mr: 1 }} /> Análise de Dados
                    </Button>
                    <Button color="inherit" component={Link} to="/probability">
                        <Analytics sx={{ mr: 1 }} /> Análise Probabilística
                    </Button>
                </Box>
            </Toolbar>
        </AppBar>
    );
}

export default Navbar;