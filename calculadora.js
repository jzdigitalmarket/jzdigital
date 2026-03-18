// *** CALCULADORA ***
let calcCurrent = '0', calcExpr = '', calcMem = null, calcEvaled = false;

const calcDisplay = document.getElementById('display');
const calcExprEl  = document.getElementById('calc-expr');
const calcMemEl   = document.getElementById('calc-mem-ind');

function calcUpdateMem() {
    calcMemEl.textContent = calcMem !== null ? 'M: ' + calcMem : '';
}

function calcAppend(v) {
    if (['+', '-', '*', '/'].includes(v)) {
        if (calcCurrent === 'Erro') return;
        calcExpr += calcCurrent + v;
        calcExprEl.textContent = calcExpr;
        calcCurrent = '0';
        calcEvaled  = false;
        calcDisplay.textContent = '0';
        return;
    }
    if (calcEvaled) { calcCurrent = '0'; calcEvaled = false; }
    if (v === '.') {
        if (calcCurrent.includes('.')) return;
        calcCurrent += '.';
    } else {
        calcCurrent = calcCurrent === '0' ? v : calcCurrent + v;
    }
    if (calcCurrent.length > 12) return;
    calcDisplay.textContent = calcCurrent;
}

function calcClear() {
    calcCurrent = '0';
    calcExpr    = '';
    calcMem     = null;
    calcEvaled  = false;
    calcDisplay.textContent = '0';
    calcExprEl.textContent  = '';
    calcUpdateMem();
}

function calcMemSave() {
    if (calcCurrent !== 'Erro') {
        calcMem = parseFloat(calcCurrent);
        calcUpdateMem();
    }
}

function calcMemRecall() {
    if (calcMem !== null) {
        calcCurrent = String(calcMem);
        calcDisplay.textContent = calcCurrent;
    }
}

function calcExecute() {
    if (!calcExpr && calcCurrent === '0') return;
    const full = calcExpr + calcCurrent;
    calcExprEl.textContent = full + ' =';
    try {
        let r = Function('"use strict"; return (' + full + ')')();
        calcCurrent = isFinite(r) ? String(+r.toPrecision(10)) : 'Erro';
    } catch(e) {
        calcCurrent = 'Erro';
    }
    calcExpr   = '';
    calcEvaled = true;
    calcDisplay.textContent = calcCurrent;
}

// Teclado — integrado com Arkanoid (não conflita com as setas/Enter do jogo)
document.addEventListener('keydown', function(e) {
    const arkanoidAberto = document.getElementById('arkanoid-widget').style.display === 'block';
    if (arkanoidAberto && (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Enter')) return;

    if ('0123456789'.includes(e.key))             calcAppend(e.key);
    else if (e.key === '+')                        calcAppend('+');
    else if (e.key === '-')                        calcAppend('-');
    else if (e.key === '*')                        calcAppend('*');
    else if (e.key === '/') { e.preventDefault();  calcAppend('/'); }
    else if (e.key === '.' || e.key === ',')       calcAppend('.');
    else if (e.key === 'Enter' || e.key === '=')   calcExecute();
    else if (e.key === 'Backspace') {
        if (calcCurrent.length > 1) { calcCurrent = calcCurrent.slice(0, -1); }
        else { calcCurrent = '0'; }
        calcDisplay.textContent = calcCurrent;
    }
    else if (e.key === 'Escape') calcClear();
});
