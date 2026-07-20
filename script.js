// Importa Firestore + coleções centralizadas em firebase-config.js (sem duplicar config)
import {
    addDoc, onSnapshot, deleteDoc, doc, updateDoc, writeBatch, getDocs, query, where
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
    auth, db,
    produtosCollection, catalogoCollection, setoresCollection, colaboradoresCollection
} from './firebase-config.js';

document.addEventListener('DOMContentLoaded', () => {

    // ---------- 1. REFERÊNCIAS DE DOM ----------
    const $ = (id) => document.getElementById(id);

    const productForm         = $('product-form');
    const productBarcodeInput = $('product-barcode');
    const productNameInput    = $('product-name');
    const productQuantityInput= $('product-quantity');
    const productExpiryInput  = $('product-expiry');
    const productSectorInput  = $('product-sector');

    const views = {
        dashboard:   $('view-dashboard'),
        addProduct:  $('view-add-product'),
        coletados:   $('view-coletados'),
        database:    $('view-database'),
        avencer:     $('view-avencer'),
        setor:       $('view-setor'),
        colaborador: $('view-colaborador'),
        configuracao:$('view-configuracao'),
        marcados:    $('view-marcados'),
    };

    const btnCard = {
        adicionar:  $('btn-card-adicionar'),
        database:   $('btn-card-database'),
        coletados:  $('btn-card-coletados'),
        avencer:    $('btn-card-avencer'),
        setor:      $('btn-card-setor'),
        colaborador:$('btn-card-colaborador'),
        config:     $('btn-card-config'),
        marcados:   $('btn-card-marcados'),
    };

    const btnToggleTheme = $('btn-toggle-theme');
    const btnBack   = $('btn-back');
    const btnHome   = $('btn-home');
    const btnLogout = $('btn-logout');

    const countEls = {
        avencer:      $('count-avencer'),
        vencidos:     $('count-vencidos'),
        conferidos:   $('count-conferidos'),
        coletados:    $('count-coletados'),
        setores:      $('count-setores'),
        colaboradores:$('count-colaboradores'),
        marcados:     $('count-marcados'),
        cloud:        $('count-cloud'),
    };

    const marcadosTableBody    = $('marcados-table-body');
    const tableBody            = $('product-table-body');
    const avencerTableBody     = $('avencer-table-body');
    const sectorTableBody      = $('sector-table-body');
    const colaboradorTableBody = $('colaborador-table-body');
    const dashboardSubtitle    = $('dashboard-subtitle');
    const dashboardMainTitle   = $('dashboard-main-title');

    const directSectorForm      = $('direct-sector-form');
    const directSectorNameInput = $('direct-sector-name');
    const directColaboradorForm = $('direct-colaborador-form');
    const directColaboradorNameInput = $('direct-colaborador-name');

    const csvFileInput      = $('csv-file-input');
    const panelCloudCounter = $('panel-cloud-counter');

    const btnScan       = $('btn-scan');
    const btnStopScan   = $('btn-stop-scan');
    const scannerWrapper= $('scanner-wrapper');
    let html5QrcodeScanner = null;

    const filterSectorAvencer = $('filter-sector-avencer');

    const btnAddSectorModal   = $('btn-add-sector-modal');
    const btnCloseSectorModal = $('btn-close-sector-modal');
    const modalSector         = $('modal-sector');
    const sectorForm          = $('sector-form');
    const newSectorNameInput  = $('new-sector-name');

    let localProducts = [];
    let localCatalogo = [];
    let currentSectorFilter = 'todos';

    // ---------- 2. NAVEGAÇÃO ENTRE ABAS ----------
    function hideAllTabs() {
        Object.values(views).forEach((v) => v && v.classList.add('hidden'));
    }
    function setHeader(title, subtitle) {
        if (dashboardMainTitle) dashboardMainTitle.textContent = title;
        if (dashboardSubtitle)  dashboardSubtitle.textContent  = subtitle;
    }
    function showTab(view, title, subtitle, { showBack = true, after } = {}) {
        stopScanner();
        hideAllTabs();
        if (view) view.classList.remove('hidden');
        if (btnBack) btnBack.classList.toggle('hidden', !showBack);
        setHeader(title, subtitle);
        if (typeof after === 'function') after();
    }

    const showAddProductTab  = () => showTab(views.addProduct,  'Adicionar Produto',      'Adicionar Produto ao Estoque', { after: () => productBarcodeInput?.focus() });
    const showDatabaseTab    = () => showTab(views.database,    'Gerenciamento de Nuvem', 'Gerenciamento de Nuvem e Integração');
    const showConfigTab      = () => showTab(views.configuracao,'Configurações',          'Configurações do Painel');
    const showColetadosTab   = () => showTab(views.coletados,   'Produtos Coletados',     'Produtos Coletados / Lista Geral');
    const showAVencerTab     = () => showTab(views.avencer,     'Produtos Críticos',      'Produtos Críticos - Vencimento Próximo', { after: renderAVencerTable });
    const showSetorTab       = () => showTab(views.setor,       'Gerenciar Setores',      'Gerenciar e Cadastrar Setores da Loja');
    const showColaboradorTab = () => showTab(views.colaborador, 'Gerenciar Colaboradores','Gerenciar e Cadastrar Colaboradores da Loja');
    const showMarcadosTab    = () => showTab(views.marcados,    'Produtos Marcados',      'Lista de itens sinalizados com destaque', { after: renderMarcadosTable });
    const showDashboardTab   = () => showTab(views.dashboard,   'Painel Geral',           'Painel Geral de Monitoramento', { showBack: false });

    btnCard.adicionar  ?.addEventListener('click', showAddProductTab);
    btnCard.database   ?.addEventListener('click', showDatabaseTab);
    btnCard.coletados  ?.addEventListener('click', showColetadosTab);
    btnCard.avencer    ?.addEventListener('click', showAVencerTab);
    btnCard.setor      ?.addEventListener('click', showSetorTab);
    btnCard.colaborador?.addEventListener('click', showColaboradorTab);
    btnCard.config     ?.addEventListener('click', showConfigTab);
    btnCard.marcados   ?.addEventListener('click', showMarcadosTab);
    btnBack ?.addEventListener('click', showDashboardTab);
    btnHome ?.addEventListener('click', showDashboardTab);

    // ---------- 3. MODAIS E CADASTROS DIRETOS ----------
    if (btnAddSectorModal && modalSector) {
        btnAddSectorModal.addEventListener('click', () => {
            modalSector.classList.remove('hidden');
            modalSector.style.display = 'flex';
            newSectorNameInput?.focus();
        });
    }
    if (btnCloseSectorModal && modalSector) {
        btnCloseSectorModal.addEventListener('click', () => {
            modalSector.classList.add('hidden');
            modalSector.style.display = 'none';
            sectorForm?.reset();
        });
    }

    sectorForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nome = newSectorNameInput.value.trim().toUpperCase();
        if (!nome) return;
        try {
            await addDoc(setoresCollection, { nome, createdAt: new Date() });
            sectorForm.reset();
            modalSector.classList.add('hidden');
            modalSector.style.display = 'none';
        } catch (err) { alert('Erro ao salvar o setor: ' + err.message); }
    });

    directSectorForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nome = directSectorNameInput.value.trim().toUpperCase();
        if (!nome) return;
        try {
            await addDoc(setoresCollection, { nome, createdAt: new Date() });
            directSectorForm.reset();
        } catch (err) { alert('Erro ao salvar o setor: ' + err.message); }
    });

    directColaboradorForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nome = directColaboradorNameInput.value.trim();
        if (!nome) return;
        try {
            await addDoc(colaboradoresCollection, { nome, createdAt: new Date() });
            directColaboradorForm.reset();
        } catch (err) { alert('Erro ao salvar o colaborador: ' + err.message); }
    });

    // ---------- 4. SINCRONIZAÇÃO EM TEMPO REAL ----------
    onSnapshot(setoresCollection, (snapshot) => {
        const lista = [];
        snapshot.forEach((d) => lista.push({ id: d.id, ...d.data() }));
        lista.sort((a, b) => a.nome.localeCompare(b.nome));

        if (countEls.setores) countEls.setores.textContent = lista.length;

        if (productSectorInput) {
            productSectorInput.innerHTML = '<option value="">Selecione um Setor</option>';
            lista.forEach((s) => {
                const o = document.createElement('option');
                o.value = s.nome; o.textContent = s.nome;
                productSectorInput.appendChild(o);
            });
        }

        if (filterSectorAvencer) {
            filterSectorAvencer.innerHTML = '<option value="todos">Todos os Setores</option>';
            lista.forEach((s) => {
                const o = document.createElement('option');
                o.value = s.nome; o.textContent = s.nome;
                if (s.nome === currentSectorFilter) o.selected = true;
                filterSectorAvencer.appendChild(o);
            });
        }

        if (sectorTableBody) {
            sectorTableBody.innerHTML = '';
            lista.forEach((s) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${s.nome}</strong></td>
                    <td style="text-align:center;">
                        <button class="btn-del btn-del-sector" data-id="${s.id}">Remover</button>
                    </td>`;
                sectorTableBody.appendChild(tr);
            });
        }
    }, (err) => console.error('Erro ao sincronizar setores:', err));

    onSnapshot(colaboradoresCollection, (snapshot) => {
        const lista = [];
        snapshot.forEach((d) => lista.push({ id: d.id, ...d.data() }));
        lista.sort((a, b) => a.nome.localeCompare(b.nome));

        if (countEls.colaboradores) countEls.colaboradores.textContent = lista.length;

        if (colaboradorTableBody) {
            colaboradorTableBody.innerHTML = '';
            lista.forEach((c) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${c.nome}</strong></td>
                    <td style="text-align:center;">
                        <button class="btn-del btn-del-colaborador" data-id="${c.id}">Remover</button>
                    </td>`;
                colaboradorTableBody.appendChild(tr);
            });
        }
    }, (err) => console.error('Erro ao sincronizar colaboradores:', err));

    onSnapshot(produtosCollection, (snapshot) => {
        localProducts = [];
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            localProducts.push({
                id: docSnap.id,
                barcode: data.barcode || '',
                name:    data.name    || '',
                quantity:data.quantity ?? 1,
                expiry:  data.expiry  || '',
                sector:  data.sector  || '',
                marcado: data.marcado === true
            });
        });
        renderTable();
        renderAVencerTable();
        renderMarcadosTable();
        updateCounters();
    }, (err) => console.error('Erro ao sincronizar produtos:', err));

    onSnapshot(catalogoCollection, (snapshot) => {
        localCatalogo = [];
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            localCatalogo.push({
                barcode: String(data.barcode || '').trim(),
                name:    String(data.name    || '').trim()
            });
        });
        const total = localCatalogo.length;
        if (countEls.cloud)     countEls.cloud.textContent     = total;
        if (panelCloudCounter)  panelCloudCounter.textContent  = `${total} PRODUTOS NA NUVEM`;
    }, (err) => console.error('Erro ao sincronizar catálogo:', err));

    // ---------- 5. AUTO-COMPLETE POR CÓDIGO DE BARRAS ----------
    function buscarProdutoPorCodigo(barcode) {
        if (!barcode || !barcode.trim()) return;
        const alvo = barcode.trim();
        const encontrado = localCatalogo.find((p) => p.barcode === alvo);
        if (encontrado && productNameInput) {
            productNameInput.value = encontrado.name;
            productExpiryInput?.focus();
        } else if (productNameInput) {
            productNameInput.value = '';
        }
    }
    if (productBarcodeInput) {
        productBarcodeInput.addEventListener('blur', () => buscarProdutoPorCodigo(productBarcodeInput.value));
        productBarcodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); buscarProdutoPorCodigo(productBarcodeInput.value); }
        });
    }

    // ---------- 6. IMPORTAÇÃO CSV (com deduplicação) ----------
    csvFileInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const text  = ev.target.result;
            const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
            // Índice de barcodes existentes para evitar duplicatas
            const existentes = new Set(localCatalogo.map((c) => c.barcode));
            let batch = writeBatch(db);
            let inBatch = 0, importados = 0, ignorados = 0;

            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].includes(';') ? lines[i].split(';') : lines[i].split(',');
                if (cols.length < 2) continue;
                const barcode = (cols[0] || '').replace(/"/g, '').trim();
                const name    = (cols[1] || '').replace(/"/g, '').trim();
                if (!barcode || !name) continue;
                if (existentes.has(barcode)) { ignorados++; continue; }
                existentes.add(barcode);

                batch.set(doc(catalogoCollection), { barcode, name });
                inBatch++; importados++;
                if (inBatch === 400) { await batch.commit(); batch = writeBatch(db); inBatch = 0; }
            }
            if (inBatch > 0) await batch.commit();

            if (importados > 0) {
                alert(`Sucesso! ${importados} produtos importados.${ignorados ? ` ${ignorados} duplicados foram ignorados.` : ''}`);
            } else if (ignorados > 0) {
                alert(`Nenhum produto novo. ${ignorados} já estavam no catálogo.`);
            } else {
                alert('Não foi possível ler os produtos. Verifique se o CSV tem código na coluna 1 e nome na coluna 2.');
            }
            csvFileInput.value = '';
        };
        reader.readAsText(file);
    });

    // ---------- 7. SCANNER DE CÂMERA ----------
    btnScan?.addEventListener('click', () => {
        scannerWrapper.classList.remove('hidden');
        html5QrcodeScanner = new Html5Qrcode('reader');
        const config = { fps: 10, qrbox: { width: 300, height: 150 } };
        html5QrcodeScanner.start(
            { facingMode: 'environment' },
            config,
            (decodedText) => {
                productBarcodeInput.value = decodedText;
                stopScanner();
                buscarProdutoPorCodigo(decodedText);
            },
            () => {}
        ).catch((err) => { alert('Erro ao acessar a câmera: ' + err); stopScanner(); });
    });
    btnStopScan?.addEventListener('click', stopScanner);

    function stopScanner() {
        if (html5QrcodeScanner && html5QrcodeScanner.isScanning) {
            html5QrcodeScanner.stop().then(() => scannerWrapper?.classList.add('hidden'))
                .catch((err) => console.log(err));
        } else {
            scannerWrapper?.classList.add('hidden');
        }
    }

    // ---------- 8. CONTADORES ----------
    function updateCounters() {
        const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
        let vencidos = 0, aVencer = 0, marcados = 0, conferidos = 0;

        localProducts.forEach((p) => {
            if (p.marcado) marcados++;
            if (!p.expiry) return;
            const exp = new Date(p.expiry + 'T00:00:00');
            if (exp < hoje) {
                vencidos++;
            } else {
                const diasRestantes = Math.ceil((exp - hoje) / 86400000);
                if (diasRestantes <= 10) aVencer++;
                else conferidos++; // conferido = em dia (>10 dias)
            }
        });

        if (countEls.avencer)    countEls.avencer.textContent    = aVencer;
        if (countEls.vencidos)   countEls.vencidos.textContent   = vencidos;
        if (countEls.conferidos) countEls.conferidos.textContent = conferidos;
        if (countEls.coletados)  countEls.coletados.textContent  = localProducts.length;
        if (countEls.marcados)   countEls.marcados.textContent   = marcados;
    }

    // ---------- 9. TABELAS ----------
    function badgeColors() {
        const isDark = document.body.classList.contains('dark-theme');
        return {
            bg:    isDark ? '#334155' : '#e2e8f0',
            color: isDark ? '#ffffff' : '#1e293b',
            qty:   isDark ? '#ffffff' : '#1e293b',
        };
    }
    function formatarData(expiry) {
        if (!expiry) return '';
        const [ano, mes, dia] = expiry.split('-');
        return (ano && mes && dia) ? `${dia}/${mes}/${ano}` : expiry;
    }

    function renderTable() {
        if (!tableBody) return;
        tableBody.innerHTML = '';
        const c = badgeColors();

        localProducts.forEach((p) => {
            const barcodeText = p.barcode || '---';
            const qtyText     = p.quantity || '1';
            const sectorText  = p.sector   || 'Geral';
            const estrela     = p.marcado ? '⭐' : '☆';
            const starClass   = p.marcado ? 'btn-star active' : 'btn-star';

            const tr = document.createElement('tr');
            // ESTRELA agora vai dentro de um <td> (corrige HTML inválido do original)
            tr.innerHTML = `
                <td data-label="" style="text-align:center;">
                    <button type="button" class="${starClass}" data-id="${p.id}" title="Marcar Produto" style="background:none;border:none;cursor:pointer;font-size:18px;">${estrela}</button>
                </td>
                <td data-label="Cód. Barras"><span style="font-family:monospace;color:#64748b;">${barcodeText}</span></td>
                <td data-label="Produto"><strong>${p.name}</strong></td>
                <td data-label="Setor"><span class="badge-sector" style="background:${c.bg};color:${c.color};padding:4px 8px;border-radius:4px;font-size:12px;font-weight:500;">${sectorText}</span></td>
                <td data-label="Qtd"><span style="font-weight:600;color:${c.qty};">${qtyText}</span></td>
                <td data-label="Vencimento">${formatarData(p.expiry)}</td>
                <td data-label="Ação" style="text-align:center;"><button class="btn-del" data-id="${p.id}">Remover</button></td>`;
            tableBody.appendChild(tr);
        });
    }

    // Delegação de eventos — evita rebind a cada snapshot
    tableBody?.addEventListener('click', async (e) => {
        const star = e.target.closest('.btn-star');
        const del  = e.target.closest('.btn-del');
        if (star) {
            const id = star.dataset.id;
            const p  = localProducts.find((x) => x.id === id);
            const novo = p ? !p.marcado : true;
            try { await updateDoc(doc(db, 'produtos', id), { marcado: novo }); }
            catch (err) { console.error('Erro ao atualizar marcação:', err.message); }
            return;
        }
        if (del) {
            const id = del.dataset.id;
            if (confirm('Deseja remover este produto definitivamente?')) {
                try { await deleteDoc(doc(db, 'produtos', id)); }
                catch (err) { alert('Erro ao deletar documento: ' + err.message); }
            }
        }
    });

    sectorTableBody?.addEventListener('click', async (e) => {
        const btn = e.target.closest('.btn-del-sector');
        if (!btn) return;
        if (confirm('Deseja remover este setor definitivamente? Isso não apagará os produtos vinculados a ele.')) {
            try { await deleteDoc(doc(db, 'setores', btn.dataset.id)); }
            catch (err) { alert('Erro ao deletar setor: ' + err.message); }
        }
    });

    colaboradorTableBody?.addEventListener('click', async (e) => {
        const btn = e.target.closest('.btn-del-colaborador');
        if (!btn) return;
        if (confirm('Deseja remover este colaborador definitivamente?')) {
            try { await deleteDoc(doc(db, 'colaboradores', btn.dataset.id)); }
            catch (err) { alert('Erro ao deletar colaborador: ' + err.message); }
        }
    });

    function renderAVencerTable() {
        if (!avencerTableBody) return;
        avencerTableBody.innerHTML = '';
        const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
        const c = badgeColors();

        localProducts.forEach((p) => {
            if (!p.expiry) return;
            const exp = new Date(p.expiry + 'T00:00:00');
            if (exp < hoje) return;
            const dias = Math.ceil((exp - hoje) / 86400000);
            if (dias > 10) return;
            if (currentSectorFilter !== 'todos' && p.sector !== currentSectorFilter) return;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td data-label="Cód. Barras"><span style="font-family:monospace;color:#64748b;">${p.barcode || '---'}</span></td>
                <td data-label="Produto"><strong>${p.name}</strong></td>
                <td data-label="Setor"><span class="badge-sector" style="background:${c.bg};color:${c.color};padding:2px 6px;border-radius:4px;font-size:11px;">${p.sector || 'Geral'}</span></td>
                <td data-label="Qtd"><span style="font-weight:600;color:${c.qty};">${p.quantity || '1'}</span></td>
                <td data-label="Vencimento">${formatarData(p.expiry)}</td>
                <td data-label="Faltam"><span class="badge vencido" style="background-color:#fff7ed;color:#c2410c;border:1px solid #ffedd5;">${dias} dias</span></td>`;
            avencerTableBody.appendChild(tr);
        });
    }

    function renderMarcadosTable() {
        if (!marcadosTableBody) return;
        marcadosTableBody.innerHTML = '';
        const c = badgeColors();
        localProducts.filter((p) => p.marcado).forEach((p) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td data-label="Cód. Barras"><span style="font-family:monospace;color:#64748b;">${p.barcode || '---'}</span></td>
                <td data-label="Produto"><strong>${p.name}</strong></td>
                <td data-label="Setor"><span class="badge-sector" style="background:${c.bg};color:${c.color};padding:4px 8px;border-radius:4px;font-size:12px;">${p.sector || 'Geral'}</span></td>
                <td data-label="Qtd"><span style="font-weight:600;color:${c.qty};">${p.quantity || '1'}</span></td>
                <td data-label="Vencimento">${formatarData(p.expiry)}</td>`;
            marcadosTableBody.appendChild(tr);
        });
    }

    filterSectorAvencer?.addEventListener('change', (e) => {
        currentSectorFilter = e.target.value;
        renderAVencerTable();
    });

    // ---------- 10. CADASTRO DE PRODUTO ----------
    productForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const barcode  = productBarcodeInput.value.trim();
        const name     = productNameInput.value.trim();
        const quantity = parseInt(productQuantityInput.value, 10) || 1;
        const expiry   = productExpiryInput.value;
        const sector   = productSectorInput.value;
        if (!name || !expiry || !sector) return;

        try {
            await addDoc(produtosCollection, { barcode, name, quantity, expiry, sector, marcado: false });
            productBarcodeInput.value = '';
            productNameInput.value    = '';
            productExpiryInput.value  = '';
            if (productQuantityInput) productQuantityInput.value = '';
            productBarcodeInput?.focus();
        } catch (err) {
            alert('Erro ao salvar no Firestore: ' + err.message);
        }
    });

    // ---------- 11. LOGOUT (Firebase Auth) ----------
    btnLogout?.addEventListener('click', async () => {
        try { await signOut(auth); } catch (e) { console.warn(e); }
        const basePath = location.pathname.substring(0, location.pathname.lastIndexOf('/') + 1);
        location.replace(location.origin + basePath + 'index.html');
    });

    // ---------- 12. TEMA ESCURO ----------
    if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark-theme');

    btnToggleTheme?.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
        renderTable();
        renderAVencerTable();
        renderMarcadosTable();
    });
});
