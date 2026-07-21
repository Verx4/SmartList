const listaProdutosV4=document.getElementById('listaProdutos');
if(listaProdutosV4){listaProdutosV4.addEventListener('click',interceptarEdicaoItemV4,true)}

function interceptarEdicaoItemV4(evento){
    const botao=evento.target.closest('.btn-excluir');
    if(!botao)return;
    if(botao.dataset.permitirExclusao==='true'){
        delete botao.dataset.permitirExclusao;
        return;
    }
    evento.preventDefault();
    evento.stopPropagation();
    evento.stopImmediatePropagation();
    const produto=botao.closest('[data-produto-id]');
    if(!produto)return;
    abrirEditorItemV4(produto,botao);
}

function atualizarProdutoLocalV4(id,alteracoes){
    try{
        const produtos=JSON.parse(localStorage.getItem('produtos')||'[]');
        if(!Array.isArray(produtos))return false;
        const indice=produtos.findIndex(item=>String(item.id)===String(id));
        if(indice<0)return false;
        produtos[indice]={...produtos[indice],...alteracoes};
        localStorage.setItem('produtos',JSON.stringify(produtos));
        return true;
    }catch(_erro){
        return false;
    }
}

function criarEditorItemV4(){
    let overlay=document.getElementById('itemEditOverlay');
    if(overlay)return overlay;
    overlay=document.createElement('div');
    overlay.id='itemEditOverlay';
    overlay.className='item-edit-overlay';
    overlay.hidden=true;
    overlay.innerHTML=`
        <section class="item-edit-sheet" role="dialog" aria-modal="true" aria-labelledby="itemEditTitle">
            <div class="item-edit-handle" aria-hidden="true"></div>
            <header class="item-edit-header">
                <h2 id="itemEditTitle">Editar item</h2>
                <button type="button" class="item-edit-close" aria-label="Fechar">×</button>
            </header>
            <div class="item-edit-field">
                <label for="itemEditName">Nome do item</label>
                <input id="itemEditName" type="text" maxlength="80" autocomplete="off">
            </div>
            <div class="item-edit-field item-edit-field-preco">
                <label for="itemEditPrice">Valor do produto</label>
                <input id="itemEditPrice" type="number" min="0" step="0.01" inputmode="decimal">
            </div>
            <div class="item-edit-actions">
                <button type="button" class="item-edit-save">Salvar nome</button>
                <button type="button" class="item-edit-delete">Remover item</button>
            </div>
        </section>`;
    document.body.appendChild(overlay);
    const fechar=()=>{
        overlay.hidden=true;
        overlay._produto=null;
        overlay._botaoExcluir=null;
        document.body.style.overflow='';
    };
    overlay.querySelector('.item-edit-close')?.addEventListener('click',fechar);
    overlay.addEventListener('click',evento=>{if(evento.target===overlay)fechar()});
    overlay.querySelector('.item-edit-save')?.addEventListener('click',()=>{
        const produto=overlay._produto;
        const id=produto?.dataset.produtoId;
        const nome=overlay.querySelector('#itemEditName')?.value.trim();
        const valor=Number(overlay.querySelector('#itemEditPrice')?.value||0);
        if(!id||!nome||!Number.isFinite(valor)||valor<0)return;
        if(atualizarProdutoLocalV4(id,{nome,preco:valor})){
            fechar();
            window.location.reload();
        }
    });
    overlay.querySelector('.item-edit-delete')?.addEventListener('click',()=>{
        const botaoExcluir=overlay._botaoExcluir;
        fechar();
        if(!botaoExcluir)return;
        botaoExcluir.dataset.permitirExclusao='true';
        botaoExcluir.click();
    });
    document.addEventListener('keydown',evento=>{if(evento.key==='Escape'&&!overlay.hidden)fechar()});
    return overlay;
}

function abrirEditorItemV4(produto,botaoExcluir){
    const overlay=criarEditorItemV4();
    const nome=produto.querySelector('h3')?.textContent?.trim()||'Editar item';
    const preco=produto.querySelector('[data-campo="preco"]')?.value||'0';
    overlay._produto=produto;
    overlay._botaoExcluir=botaoExcluir;
    overlay.querySelector('#itemEditTitle').textContent='Editar item';
    overlay.querySelector('#itemEditName').value=nome;
    overlay.querySelector('#itemEditPrice').value=preco;
    overlay.hidden=false;
    document.body.style.overflow='hidden';
    setTimeout(()=>overlay.querySelector('#itemEditName')?.focus(),30);
}

const mobileCss=document.createElement('link');
mobileCss.rel='stylesheet';
mobileCss.href='./css/mobile-app.css';
document.head.appendChild(mobileCss);
import('./mobile-nav.js');

const dashboardV5Css=document.createElement('link');
dashboardV5Css.rel='stylesheet';
dashboardV5Css.href='./css/dashboard-mobile-v5.css?v=2';
document.head.appendChild(dashboardV5Css);
import('./dashboard-mobile-v5.js?v=2');
import('./categorias-v2.js?v=2');

const dashboardV6Css=document.createElement('link');
dashboardV6Css.rel='stylesheet';
dashboardV6Css.href='./css/dashboard-mobile-v6.css?v=5';
document.head.appendChild(dashboardV6Css);
import('./dashboard-mobile-v6.js?v=5');
import('./scanner-nota.js?v=2');
import('./listas-salvas-ui.js?v=1');