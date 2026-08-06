from flask import Flask
from flask_cors import CORS
import pandas as pd
import os

# Importa apenas o blueprint, não a função load_csv
from routes.api import api, df

app = Flask(__name__)

# Permite requisições do frontend React (localhost:5173)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:5173"}})

app.register_blueprint(api, url_prefix='/api')

# Carregar CSV automaticamente ao iniciar
csv_path = os.path.join('data', 'euromillions.csv')
if os.path.exists(csv_path):
    df_global = pd.read_csv(csv_path)
    # Atualiza o df global do módulo api
    import routes.api
    routes.api.df = df_global
    print(f"CSV carregado com {len(df_global)} linhas")
else:
    print(f"CSV não encontrado em {csv_path}")

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)