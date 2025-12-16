
const KEY = "kanban:v2";
const $ = s => document.querySelector(s);


let state = JSON.parse(localStorage.getItem(KEY)) || {
  boards: [
    { id: uid(), title: "📝 Backlog", cards: [] },
    { id: uid(), title: "🔨 Em Progresso", cards: [] },
    { id: uid(), title: "✅ Concluído", cards: [] }
  ]
};

function uid() { 
  return Date.now().toString(36) + Math.random().toString(36).slice(2,6); 
}
const save = () => localStorage.setItem(KEY, JSON.stringify(state));


function openModal(title, html, onConfirm){
  $("#modalTitle").textContent = title;
  $("#modalContent").innerHTML = html;
  $("#modalConfirm").onclick = () => { onConfirm(); };
  $("#modalOverlay").classList.add("active");
  setTimeout(()=>{
    const f = $("#modalContent").querySelector("input, textarea");
    if (f) f.focus();
  }, 50);
}
const closeModal = () => $("#modalOverlay").classList.remove("active");

$("#modalOverlay").addEventListener("click", e => e.target === e.currentTarget && closeModal());

document.addEventListener("keydown", e => e.key === "Escape" && closeModal());


function toast(msg, type = "ok"){
  const t = document.createElement("div");
  t.className = "toast" + (type==="error" ? " error" : "");
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(()=> t.remove(), 3000);
}


function renderSelect(){
  const sel = $("#selectBoard");
  if (!sel) return;
  sel.innerHTML = `<option value="">Selecione o quadro</option>`;
  state.boards.forEach(b => {
    const opt = document.createElement("option");
    opt.value = b.id;
    opt.textContent = b.title;
    sel.appendChild(opt);
  });
}

function getDropIndex(container, y){
  const items = [...container.querySelectorAll(".card:not(.dragging)")];
  let idx = items.findIndex(el => y < el.getBoundingClientRect().top + el.offsetHeight/2);
  return idx === -1 ? items.length : idx;
}


function moveCard(fromId, toId, cardId, index = null){
  
  const from = state.boards.find(b => b.id === fromId);
  const to = state.boards.find(b => b.id === toId);
  if (!from || !to) return;
  const i = from.cards.findIndex(c => c.id === cardId);
  if (i === -1) return;
  const [card] = from.cards.splice(i,1);
  if (index === null) to.cards.push(card);
  else to.cards.splice(Math.max(0, Math.min(index, to.cards.length)), 0, card);
  save(); render();
}


function create(tag, cls, txt){ const e = document.createElement(tag); if (cls) e.className = cls; if (txt) e.textContent = txt; return e; }

function render(){
  const wrap = $("#boardsWrap");
  wrap.innerHTML = "";
  renderSelect();

  state.boards.forEach(board => {
    const section = create("section", "board");
    section.dataset.id = board.id;


    const header = create("div", "board-header");
    const title = create("div", "board-title", board.title);
    header.appendChild(title);

    const controls = create("div");
    const btnEdit = create("button","btn","Editar");

    btnEdit.onclick = () => openModal("Editar Quadro", `<input id="editBoard" value="${board.title}">`, () => {
      const v = $("#editBoard").value.trim();
      if (!v) return toast("Nome inválido", "error");
      board.title = v; 
      save(); 
      render(); 
      closeModal(); 
      toast("Quadro atualizado!");
    });

    const btnDel = create("button","btn ghost","Excluir");
    btnDel.onclick = () => openModal("Excluir Quadro", `<p>Excluir quadro "<strong>${board.title}</strong>" e todos os cartões?</p>`, () => {
      state.boards = state.boards.filter(b => b.id !== board.id);
      save(); 
      render(); 
      closeModal(); 
      toast("Quadro excluído!", "error");
    });

    controls.append(btnEdit, btnDel); 
    header.appendChild(controls);

    
    const cardsWrap = create("div","cards");
    cardsWrap.dataset.boardId = board.id;

    cardsWrap.addEventListener("dragover", e => { e.preventDefault(); cardsWrap.classList.add("drag-over"); });
    cardsWrap.addEventListener("dragleave", () => cardsWrap.classList.remove("drag-over"));
    cardsWrap.addEventListener("drop", e => {
      e.preventDefault(); cardsWrap.classList.remove("drag-over");
      try {
        const data = JSON.parse(e.dataTransfer.getData("text"));
        const idx = getDropIndex(cardsWrap, e.clientY);
        moveCard(data.fromBoard, board.id, data.cardId, idx);
        toast("Cartão movido!");
      } catch { }
    });

    board.cards.forEach(card => {
      const cardEl = create("article","card");
      cardEl.dataset.cardId = card.id;

      cardEl.draggable = true;

      cardEl.addEventListener("dragstart", ev => {
        ev.dataTransfer.setData("text", JSON.stringify({ cardId: card.id, fromBoard: board.id }));
        requestAnimationFrame(()=> cardEl.classList.add("dragging"));
      });

      cardEl.addEventListener("dragend", () => cardEl.classList.remove("dragging"));

      const t = create("div","card-title", card.title);
      const d = create("div","card-desc", card.desc || "");
      const actions = create("div","card-actions");

      const eBtn = create("button","btn","Editar");
      eBtn.onclick = () => openModal("Editar Cartão",
        `<input id="edtTitle" value="${card.title}"><textarea id="edtDesc">${card.desc||""}</textarea>`,
        () => {
          const nt = $("#edtTitle").value.trim();
          if (!nt) return toast("Título vazio", "error");
          card.title = nt; card.desc = $("#edtDesc").value; save(); render(); closeModal(); toast("Cartão atualizado!");
        });

      const delBtn = create("button","btn ghost","Excluir");
      delBtn.onclick = () => openModal("Excluir Cartão", `<p>Excluir cartão "<strong>${card.title}</strong>"?</p>`, () => {
        board.cards = board.cards.filter(c => c.id !== card.id);
        save(); render(); closeModal(); toast("Cartão excluído!", "error");
      });

      actions.append(eBtn, delBtn);
      cardEl.append(t, d, actions);
      cardsWrap.appendChild(cardEl);
    });

    
    const footer = create("div","board-footer");
    const addBtn = create("button","add-card-btn","+ Adicionar Cartão");
    addBtn.onclick = () => openModal("Novo Cartão", `<input id="newTitle" placeholder="Título"><textarea id="newDesc" placeholder="Descrição"></textarea>`, () => {
      const t = $("#newTitle").value.trim();
      if (!t) return toast("Título obrigatório", "error");
      board.cards.push({ id: uid(), title: t, desc: $("#newDesc").value });
      save(); render(); closeModal(); toast("Cartão criado!");
    });
    footer.appendChild(addBtn);

    
    section.append(header, cardsWrap, footer);
    wrap.appendChild(section);
  });
}


$("#btnQuickBoard").addEventListener("click", ()=>{
  const v = $("#inputBoardName").value.trim();
  if (!v) return toast("Digite um nome", "error");
  state.boards.push({ id: uid(), title: v, cards: [] });
  $("#inputBoardName").value = "";
  save(); render(); toast("Quadro criado!");
});

$("#btnAddCard").addEventListener("click", ()=>{
  const t = $("#cardTitle").value.trim();
  const desc = $("#cardDesc").value.trim();
  const bid = $("#selectBoard").value;
  if (!t || !bid) return toast("Preencha título e selecione quadro", "error");
  const board = state.boards.find(b => b.id === bid);
  board.cards.push({ id: uid(), title: t, desc });
  $("#cardTitle").value = ""; $("#cardDesc").value = "";
  save(); render(); toast("Cartão criado!");
});


$("#btnExport").addEventListener("click", ()=>{
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `kanban-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast("Exportado com sucesso!");
});

$("#importFile").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  const r = new FileReader();
  r.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!data || !Array.isArray(data.boards)) return toast("JSON inválido", "error");
      openModal("Importar Dados", `<p>Isso substituirá os quadros atuais. Total de quadros no arquivo: <strong>${data.boards.length}</strong></p>`,
        ()=>{
          state = data;
          save(); render(); closeModal(); toast("Importado com sucesso!");
        }
      );
    } catch {
      toast("Erro ao ler arquivo", "error");
    }
  };
  r.readAsText(file);
  e.target.value = "";
});


$("#btnClear").addEventListener("click", ()=>{
  openModal("Limpar Tudo", `<p style="color:#b91c1c">⚠️ Isso removerá todos os quadros e cartões!</p><p>Total atual: <strong>${state.boards.length} quadros</strong></p>`,
    ()=>{ state = { boards: [] }; save(); render(); closeModal(); toast("Tudo limpo!", "error"); }
  );
});

save();
render();
