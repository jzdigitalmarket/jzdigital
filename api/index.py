from flask import Flask, request, jsonify

app = Flask(__name__)

# Banco de dados temporário
ranking = []

@app.route('/api/save-score', methods=['POST'])
def save_score():
    data = request.get_json()
    nome = data.get('nome', 'Anônimo')
    pontos = data.get('pontos', 0)
    
    ranking.append({"nome": nome, "pontos": pontos})
    # Ordena do maior para o menor e pega os 5 melhores
    ranking.sort(key=lambda x: x['pontos'], reverse=True)
    
    return jsonify(ranking[:5])

@app.route('/api/get-ranking', methods=['GET'])
def get_ranking():
    return jsonify(ranking[:5])
