
class ChessAI{
    constructor(engine){
        this.engine=engine;
    }

    bestMove(){
        const moves=this.engine.generateMoves();
        return moves[Math.floor(Math.random()*moves.length)];
    }
}
