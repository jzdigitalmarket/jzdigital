
class ChessEngine {
    constructor(){
        this.reset();
    }

    reset(){
        this.board = [
            ["r","n","b","q","k","b","n","r"],
            ["p","p","p","p","p","p","p","p"],
            [".",".",".",".",".",".",".","."],
            [".",".",".",".",".",".",".","."],
            [".",".",".",".",".",".",".","."],
            [".",".",".",".",".",".",".","."],
            ["P","P","P","P","P","P","P","P"],
            ["R","N","B","Q","K","B","N","R"]
        ];
        this.turn = "white";
    }

    clone(){
        return JSON.parse(JSON.stringify(this));
    }

    isWhite(p){ return p===p.toUpperCase(); }

    generateMoves(){
        const moves=[];
        for(let r=0;r<8;r++){
            for(let c=0;c<8;c++){
                let p=this.board[r][c];
                if(p===".") continue;
                if(this.turn==="white" && !this.isWhite(p)) continue;
                if(this.turn==="black" && this.isWhite(p)) continue;

                if(p.toLowerCase()==="p"){
                    let dir=this.isWhite(p)?-1:1;
                    if(this.board[r+dir] && this.board[r+dir][c]===".")
                        moves.push({fr:r,fc:c,tr:r+dir,tc:c});
                }

                if(p.toLowerCase()==="n"){
                    [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]]
                    .forEach(([dr,dc])=>{
                        if(this.board[r+dr] && this.board[r+dr][c+dc]!==undefined)
                            moves.push({fr:r,fc:c,tr:r+dr,tc:c+dc});
                    });
                }
            }
        }
        return moves;
    }

    makeMove(m){
        this.board[m.tr][m.tc]=this.board[m.fr][m.fc];
        this.board[m.fr][m.fc]=".";
        this.turn=this.turn==="white"?"black":"white";
    }
}
