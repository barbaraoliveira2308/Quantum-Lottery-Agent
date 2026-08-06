import schedule
import time
import pandas as pd
import requests
from datetime import datetime
import os

KAGGLE_URL = "https://www.kaggle.com/datasets/duartepereiradacruz/euromillions-historical-data/data"
DATA_FILE = "data/euromillions.csv"

def update_data():
    """
    Baixa e atualiza os dados do EuroMillions
    """
    print(f"[{datetime.now()}] Iniciando atualização dos dados...")
    
    try:
        # Tentar baixar do Kaggle (se tiver API key configurada)
        # Opção 1: Usar kaggle-cli (precisa de autenticação)
        # os.system('kaggle datasets download -d duartepereiradacruz/euromillions-historical-data')
        
        # Opção 2: Download direto (se o link for público)
        response = requests.get(KAGGLE_URL, stream=True)
        if response.status_code == 200:
            with open(DATA_FILE, 'wb') as f:
                f.write(response.content)
            print(f"[{datetime.now()}] Dados atualizados com sucesso!")
        else:
            print(f"[{datetime.now()}] Erro ao baixar dados: {response.status_code}")
            
    except Exception as e:
        print(f"[{datetime.now()}] Erro na atualização: {e}")

# Agendar para toda terça e sexta às 20h
schedule.every().tuesday.at("20:00").do(update_data)
schedule.every().friday.at("20:00").do(update_data)

print("Bot de atualização iniciado. Aguardando próximos horários...")
print("Próxima atualização: Terça e Sexta às 20:00")

while True:
    schedule.run_pending()
    time.sleep(60)  # Verificar a cada minuto