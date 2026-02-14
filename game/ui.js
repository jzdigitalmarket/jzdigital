
const engine=new ChessEngine();
const boardDiv=document.getElementById("board");
const statusDiv=document.getElementById("status");

const pieces={
r:"♜",n:"♞",b:"♝",q:"♛",k:"♚",p:"♟",
R:"♖",N:"♘",B:"♗",Q:"♕",K:"♔",P:"♙"
};

function draw(){
    boardDiv.innerHTML="";
    for(let r=0;r<8;r++){
        for(let c=0;c<8;c++){
            const sq=document.createElement("div");
            sq.className="square "+((r+c)%2===0?"white":"black");
            sq.dataset.r=r;
            sq.dataset.c=c;
            let p=engine.board[r][c];
            if(p!==".") sq.textContent=pieces[p];
            sq.onclick=clickSquare;
            boardDiv.appendChild(sq);
        }
    }
    statusDiv.textContent="Turno: "+engine.turn;
}

let selected=null;

function clickSquare(e){
    const r=+e.currentTarget.dataset.r;
    const c=+e.currentTarget.dataset.c;

    if(selected){
        engine.makeMove({fr:selected.r,fc:selected.c,tr:r,tc:c});
        selected=null;
        draw();
        setTimeout(aiMove,300);
        return;
    }

    selected={r,c};
}

function aiMove(){
    const ai=new ChessAI(engine);
    const move=ai.bestMove();
    if(move){
        engine.makeMove(move);
        draw();
    }
}

draw();
