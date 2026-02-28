from flask import Flask, request, jsonify
import random

app = Flask(__name__)

@app.route('/api/elogio', methods=['GET'])
def elogio_ironico():
    nome = request.args.get('nome', 'Jogador Desconhecido')
    
    frases = [
        f"{nome}, você joga como um bot de 1995!",
        f"Incrível, {nome}. Você quase acertou a tecla!",
        f"Que técnica refinada, {nome}. Parece um gato andando no teclado.",
        f"O {nome} é o terror... dos próprios aliados."
    ]
    
    return jsonify({
        "mensagem": random.choice(frases),
        "origem": "Backend Python no Vercel"
    })

# O Vercel precisa que o app seja exportado
if __name__ == "__main__":
    app.run()
