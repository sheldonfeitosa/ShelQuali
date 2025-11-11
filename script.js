// Estado da aplicação
let panels = []; // Array de painéis/projetos
let currentPanelId = null; // ID do painel atual selecionado
let panelIdCounter = 1; // Contador de IDs para painéis
let demands = [];
let demandIdCounter = 1;
let availablePeople = []; // Lista de pessoas disponíveis para colaboração
let isUpdatingFromRealtime = false; // Flag para evitar loops na sincronização
let googleCalendarToken = null; // Token de acesso do Google Calendar
let googleCalendarClient = null; // Cliente OAuth do Google
let googleCalendarClientId = null; // Client ID do Google Calendar

// Elementos DOM
const addDemandBtn = document.getElementById('add-demand-btn');
const demandModal = document.getElementById('demand-modal');
const closeModalBtn = document.getElementById('close-modal');
const cancelBtn = document.getElementById('cancel-btn');
const demandForm = document.getElementById('demand-form');
const navLinks = document.querySelectorAll('.nav-link');
const deadlineModal = document.getElementById('deadline-modal');
const closeDeadlineModalBtn = document.getElementById('close-deadline-modal');
const cancelDeadlineBtn = document.getElementById('cancel-deadline-btn');
const deadlineForm = document.getElementById('deadline-form');
let pendingDemandId = null; // Armazena o ID da demanda que está aguardando prazo
const collaboratorsModal = document.getElementById('collaborators-modal');
const closeCollaboratorsModalBtn = document.getElementById('close-collaborators-modal');
const cancelCollaboratorsBtn = document.getElementById('cancel-collaborators-btn');
const addCollaboratorBtn = document.getElementById('add-collaborator-btn');
let currentDemandForCollaborators = null; // Armazena o ID da demanda sendo editada
const tasksChatModal = document.getElementById('tasks-chat-modal');
const closeTasksChatModalBtn = document.getElementById('close-tasks-chat-modal');
const addTaskBtn = document.getElementById('add-task-btn');
const sendChatBtn = document.getElementById('send-chat-btn');
let currentDemandForTasksChat = null; // Armazena o ID da demanda sendo visualizada
let currentUserName = 'Você'; // Nome do usuário atual (pode ser configurado)
let panelSelector, newPanelBtn, managePanelsBtn, panelsModal, closePanelsModalBtn;
let panelFormModal, closePanelFormModalBtn, panelForm, cancelPanelFormBtn, createPanelBtn;
let currentPanelForEdit = null; // Armazena o ID do painel sendo editado
let transferDemandModal, closeTransferDemandModalBtn, transferPanelSelect, cancelTransferDemandBtn, confirmTransferDemandBtn;
let currentDemandForTransfer = null; // Armazena o ID da demanda sendo transferida
const demandPrioritySelect = document.getElementById('demand-priority');
const gutTriggerBtn = document.getElementById('gut-trigger-btn');
const gutPanel = document.getElementById('gut-panel');
const gutApplyBtn = document.getElementById('gut-apply-btn');
const gutCancelBtn = document.getElementById('gut-cancel-btn');
const gutClearBtn = document.getElementById('gut-clear-btn');
const gutScoreValueEl = document.getElementById('gut-score-value');
const gutScoreTagEl = document.getElementById('gut-score-tag');
const gutInputs = document.querySelectorAll('.gut-input');
const gutValueDisplays = {
    gravidade: document.getElementById('gut-gravidade-value'),
    urgencia: document.getElementById('gut-urgencia-value'),
    tendencia: document.getElementById('gut-tendencia-value')
};
const priorityModeBadge = document.getElementById('priority-mode-badge');
const priorityModeBadgeScore = document.getElementById('priority-mode-badge-score');
const priorityModeBadgeLabel = document.getElementById('priority-mode-badge-label');

let currentPriorityMode = 'manual';
let currentGutState = {
    gravidade: 3,
    urgencia: 3,
    tendencia: 3,
    score: 27,
    priority: 'media'
};
let draftGutState = { ...currentGutState };

function createDefaultGutState(values = { gravidade: 3, urgencia: 3, tendencia: 3 }) {
    const base = {
        gravidade: Number(values.gravidade) || 3,
        urgencia: Number(values.urgencia) || 3,
        tendencia: Number(values.tendencia) || 3
    };
    base.score = calculateGutScore(base);
    base.priority = mapGutScoreToPriority(base.score);
    return base;
}

function calculateGutScore({ gravidade, urgencia, tendencia }) {
    const g = Number(gravidade) || 0;
    const u = Number(urgencia) || 0;
    const t = Number(tendencia) || 0;
    return g * u * t;
}

function mapGutScoreToPriority(score) {
    if (score >= 100) return 'urgente';
    if (score >= 65) return 'alta';
    if (score >= 28) return 'media';
    return 'baixa';
}

function getPriorityLabel(priority) {
    return {
        baixa: 'Baixa',
        media: 'Média',
        alta: 'Alta',
        urgente: 'Urgente'
    }[priority] || 'Média';
}

function syncGutInputsFromState(state) {
    if (!gutInputs) return;
    gutInputs.forEach(input => {
        const field = input.dataset.field;
        if (!field || typeof state[field] === 'undefined') return;
        input.value = state[field];
        if (gutValueDisplays[field]) {
            gutValueDisplays[field].textContent = state[field];
        }
    });
}

function updateGutPreview(state = draftGutState) {
    if (!gutScoreValueEl || !gutScoreTagEl) return;
    const score = calculateGutScore(state);
    const priority = mapGutScoreToPriority(score);
    gutScoreValueEl.textContent = score;
    gutScoreTagEl.textContent = `Prioridade ${getPriorityLabel(priority)}`;
    gutScoreTagEl.classList.remove('priority-baixa', 'priority-media', 'priority-alta', 'priority-urgente');
    gutScoreTagEl.classList.add(`priority-${priority}`);
}

function openGutPanel() {
    if (!gutPanel) return;
    gutPanel.classList.add('is-open');
    gutPanel.removeAttribute('hidden');
}

function closeGutPanel() {
    if (!gutPanel) return;
    gutPanel.classList.remove('is-open');
    gutPanel.setAttribute('hidden', 'true');
}

function updatePriorityModeBadge() {
    if (!priorityModeBadge) return;
    if (currentPriorityMode !== 'gut') {
        priorityModeBadge.hidden = true;
        priorityModeBadge.classList.remove('priority-baixa', 'priority-media', 'priority-alta', 'priority-urgente');
        return;
    }

    const score = currentGutState.score ?? calculateGutScore(currentGutState);
    const priority = currentGutState.priority ?? mapGutScoreToPriority(score);

    priorityModeBadge.hidden = false;
    priorityModeBadge.classList.remove('priority-baixa', 'priority-media', 'priority-alta', 'priority-urgente');
    priorityModeBadge.classList.add(`priority-${priority}`);

    if (priorityModeBadgeScore) {
        priorityModeBadgeScore.textContent = score;
    }
    if (priorityModeBadgeLabel) {
        priorityModeBadgeLabel.textContent = getPriorityLabel(priority);
    }
}

function setPriorityUiForManual({ resetSelectValue = false, syncDraft = false } = {}) {
    currentPriorityMode = 'manual';
    if (demandPrioritySelect) {
        demandPrioritySelect.disabled = false;
        demandPrioritySelect.classList.remove('priority-select-locked');
        if (resetSelectValue) {
            const defaultValue = demandPrioritySelect.dataset.default || demandPrioritySelect.getAttribute('data-default') || 'media';
            demandPrioritySelect.value = defaultValue;
        }
    }

    if (gutTriggerBtn) {
        gutTriggerBtn.textContent = '🧭 Usar Matriz GUT';
    }
    if (gutClearBtn) {
        gutClearBtn.hidden = true;
    }

    closeGutPanel();

    if (priorityModeBadge) {
        priorityModeBadge.hidden = true;
        priorityModeBadge.classList.remove('priority-baixa', 'priority-media', 'priority-alta', 'priority-urgente');
    }

    if (syncDraft) {
        draftGutState = createDefaultGutState();
        syncGutInputsFromState(draftGutState);
        updateGutPreview(draftGutState);
    }
}

function setPriorityUiForGut() {
    currentPriorityMode = 'gut';
    if (demandPrioritySelect) {
        demandPrioritySelect.disabled = true;
        demandPrioritySelect.classList.add('priority-select-locked');
        demandPrioritySelect.value = currentGutState.priority;
    }

    if (gutTriggerBtn) {
        gutTriggerBtn.textContent = '✏️ Ajustar Matriz GUT';
    }
    if (gutClearBtn) {
        gutClearBtn.hidden = false;
    }

    updatePriorityModeBadge();
    closeGutPanel();
}

function resetPriorityControls({ resetSelectValue = false } = {}) {
    currentGutState = createDefaultGutState();
    draftGutState = { ...currentGutState };
    setPriorityUiForManual({ resetSelectValue, syncDraft: true });
}

function applyGutSelection() {
    const score = calculateGutScore(draftGutState);
    const priority = mapGutScoreToPriority(score);
    currentGutState = {
        gravidade: draftGutState.gravidade,
        urgencia: draftGutState.urgencia,
        tendencia: draftGutState.tendencia,
        score,
        priority
    };
    setPriorityUiForGut();
}

function clearGutSelection({ resetSelectValue = false } = {}) {
    resetPriorityControls({ resetSelectValue });
}

function setPriorityStateFromDemand(demand) {
    if (!demand) return;
    if (demand.priorityStrategy === 'gut' && demand.gut) {
        currentGutState = {
            gravidade: Number(demand.gut.gravidade) || 3,
            urgencia: Number(demand.gut.urgencia) || 3,
            tendencia: Number(demand.gut.tendencia) || 3,
            score: Number(demand.gut.score) || calculateGutScore(demand.gut),
            priority: demand.gut.priority || demand.priority || 'media'
        };
        draftGutState = { ...currentGutState };
        syncGutInputsFromState(draftGutState);
        updateGutPreview(draftGutState);
        setPriorityUiForGut();
    } else {
        draftGutState = createDefaultGutState();
        currentGutState = { ...draftGutState };
        syncGutInputsFromState(draftGutState);
        updateGutPreview(draftGutState);
        setPriorityUiForManual({ resetSelectValue: false });
        if (demandPrioritySelect) {
            demandPrioritySelect.value = demand.priority;
        }
    }
}

function extractPriorityData() {
    if (currentPriorityMode === 'gut') {
        const score = currentGutState.score ?? calculateGutScore(currentGutState);
        const priority = currentGutState.priority ?? mapGutScoreToPriority(score);
        return {
            priority,
            priorityStrategy: 'gut',
            gut: {
                gravidade: currentGutState.gravidade,
                urgencia: currentGutState.urgencia,
                tendencia: currentGutState.tendencia,
                score,
                priority
            }
        };
    }

    return {
        priority: demandPrioritySelect ? demandPrioritySelect.value : 'media',
        priorityStrategy: 'manual',
        gut: null
    };
}

function handleGutTrigger() {
    if (!gutPanel) return;
    if (!gutPanel.hasAttribute('hidden') && gutPanel.classList.contains('is-open')) {
        closeGutPanel();
        return;
    }

    draftGutState = currentPriorityMode === 'gut'
        ? { ...currentGutState }
        : createDefaultGutState();

    syncGutInputsFromState(draftGutState);
    updateGutPreview(draftGutState);
    openGutPanel();
}

function handleGutInput(event) {
    const input = event.target;
    if (!input || !input.dataset.field) return;
    const field = input.dataset.field;
    const value = parseInt(input.value, 10) || 1;
    draftGutState[field] = value;
    if (gutValueDisplays[field]) {
        gutValueDisplays[field].textContent = value;
    }
    updateGutPreview(draftGutState);
}

function handleGutApply() {
    applyGutSelection();
}

function handleGutCancel() {
    if (currentPriorityMode === 'gut') {
        draftGutState = { ...currentGutState };
    } else {
        draftGutState = createDefaultGutState();
    }
    syncGutInputsFromState(draftGutState);
    updateGutPreview(draftGutState);
    closeGutPanel();
}

// Registrar Service Worker para PWA
// Service Worker só funciona em HTTPS ou localhost, não em file://
if ('serviceWorker' in navigator) {
  const isLocalFile = window.location.protocol === 'file:';
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  // Só tentar registrar se não estiver em file://
  if (!isLocalFile) {
    window.addEventListener('load', () => {
      // Tentar registrar com caminho relativo ou absoluto dependendo do ambiente
      const swPath = window.location.pathname.includes('/index.html') 
        ? './sw.js' 
        : '/sw.js';
      
      navigator.serviceWorker.register(swPath)
        .then((registration) => {
          console.log('✅ Service Worker registrado com sucesso:', registration.scope);
          
          // Verificar atualizações periodicamente
          setInterval(() => {
            registration.update();
          }, 60000); // A cada 1 minuto
        })
        .catch((error) => {
          // Só mostrar erro se não for um erro esperado (ex: Service Worker não suportado)
          if (error.message && !error.message.includes('not supported')) {
            console.log('ℹ️ Service Worker não disponível (normal em desenvolvimento local):', error.message);
          }
        });
    });
  } else {
    console.log('ℹ️ Service Worker desabilitado em ambiente local (file://)');
  }
}

// Detectar se está rodando como PWA
if (window.matchMedia('(display-mode: standalone)').matches) {
  console.log('📱 Aplicação rodando como PWA');
  document.body.classList.add('pwa-mode');
}

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    // Verificar se é um convite (link com parâmetros)
    const urlParams = new URLSearchParams(window.location.search);
    const isInvite = urlParams.get('invite') === 'true';
    
    // Se não for convite e não estiver autenticado, redirecionar para homepage
    if (!isInvite && localStorage.getItem('qualishel_authenticated') !== 'true') {
        window.location.href = 'homepage.html';
        return;
    }
    
    // Se mudou de usuário, recarregar dados (isolamento por usuário)
    // IMPORTANTE: Esta limpeza só acontece quando REALMENTE muda de usuário, não em cada carregamento
    const lastUser = sessionStorage.getItem('qualishel_last_user');
    const currentUser = localStorage.getItem('qualishel_current_user');
    
    // Só limpar se: 1) houver um usuário anterior registrado E 2) for diferente do atual
    // Isso garante que não limpamos dados em recarregamentos normais da página
    if (lastUser && currentUser && lastUser !== currentUser) {
        console.log(`🔄 Usuário mudou de ${lastUser} para ${currentUser}. LIMPANDO dados do usuário anterior e recarregando...`);
        
        // 1. Limpar listeners anteriores ANTES de limpar dados
        if (typeof window.firebaseService !== 'undefined') {
            console.log('🛑 Removendo todos os listeners do usuário anterior...');
            window.firebaseService.removeAllListeners();
        }
        
        // 2. LIMPAR DADOS ANTIGOS DA MEMÓRIA (importante para isolamento)
        panels = [];
        demands = [];
        currentPanelId = null;
        panelIdCounter = 1;
        demandIdCounter = 1;
        availablePeople = [];
        isUpdatingFromRealtime = false; // Resetar flag de sincronização
        
        // 3. LIMPAR APENAS DADOS DO USUÁRIO ANTERIOR (proteger dados do usuário atual e credenciais)
        // CRÍTICO: NUNCA remover dados do usuário atual ou credenciais (qualishel_users)
        console.log('🧹 Limpando localStorage de dados do usuário anterior...');
        const previousUserId = lastUser.toLowerCase().replace(/\s+/g, '_');
        const currentUserId = currentUser.toLowerCase().replace(/\s+/g, '_');
        const keysToKeep = [
            'qualishel_authenticated', 
            'qualishel_current_user', 
            'qualishel_users', // CREDENCIAIS - NUNCA REMOVER
            // Configurações globais que devem ser preservadas
            'qualishel-email-config',
            'qualishel-user-name',
            'qualishel-production-url',
            'qualishel-notifications-enabled',
            'qualishel-auto-add-to-calendar',
            'qualishel-google-calendar-client-id',
            'qualishel-google-calendar-token',
            'qualishel-google-calendar-user-email'
        ];
        // Adicionar TODAS as chaves do usuário ATUAL à lista de proteção (NUNCA remover)
        const allKeys = Object.keys(localStorage);
        allKeys.forEach(key => {
            // Proteger TODAS as chaves que contêm userId do usuário ATUAL
            if (key.includes(`-${currentUserId}`) || key.includes(`-${currentUserId}-`)) {
                keysToKeep.push(key);
            }
        });
        // Remover APENAS dados do usuário ANTERIOR (não do atual) e chaves antigas (sem userId)
        // CRÍTICO: NUNCA remover credenciais (qualishel_users, qualishel_authenticated, qualishel_current_user)
        allKeys.forEach(key => {
            // PROTEÇÃO ABSOLUTA: Nunca remover credenciais, independente de qualquer condição
            if (key === 'qualishel_users' || key === 'qualishel_authenticated' || key === 'qualishel_current_user') {
                console.log(`🔒 PROTEÇÃO ABSOLUTA: Credencial protegida - ${key}`);
                return; // Pular esta chave completamente
            }
            
            if (key.startsWith('qualishel-') && !keysToKeep.includes(key)) {
                // Verificar se é uma chave do usuário anterior (para remover) ou chave antiga (sem userId)
                const isPreviousUserKey = key.includes(`-${previousUserId}`) || key.includes(`-${previousUserId}-`);
                const isOldKey = ['qualishel-panels', 'qualishel-panel-counter', 'qualishel-current-panel',
                                 'qualishel-demands', 'qualishel-demand-counter', 'qualishel-people']
                                 .includes(key);
                
                // Só remover se for do usuário anterior OU chave antiga (sem userId)
                // NUNCA remover se for do usuário atual
                if (isPreviousUserKey || isOldKey) {
                    // Verificação de segurança: garantir que não é do usuário atual
                    if (!key.includes(`-${currentUserId}`) && !key.includes(`-${currentUserId}-`)) {
                        console.log(`🗑️ Removendo chave do localStorage: ${key} (usuário anterior ou chave antiga)`);
                        localStorage.removeItem(key);
                    } else {
                        console.log(`⚠️ PROTEÇÃO: Tentativa de remover chave do usuário atual bloqueada: ${key}`);
                    }
                }
            }
        });
        
        // 4. Limpar interface visual
        const columns = ['pendente', 'andamento', 'revisao', 'concluido'];
        columns.forEach(status => {
            const column = document.getElementById(`column-${status}`);
            if (column) {
                column.innerHTML = '';
            }
        });
        
        // 5. Atualizar exibição do nome do usuário
        updateUserNameDisplay();
        
        console.log('✅ Limpeza completa concluída. Pronto para carregar dados do novo usuário.');
    }
    // Salvar usuário atual na sessão e atualizar exibição
    if (currentUser) {
        sessionStorage.setItem('qualishel_last_user', currentUser);
    }
    
    // Se for convite mas não estiver autenticado, permitir acesso temporário
    if (isInvite && localStorage.getItem('qualishel_authenticated') !== 'true') {
        // Autenticar automaticamente para convidados
        localStorage.setItem('qualishel_authenticated', 'true');
        localStorage.setItem('qualishel_current_user', 'Convidado');
        
        // Configurar tipo de acesso baseado no parâmetro do link
        const accessType = urlParams.get('access') || 'card';
        if (accessType === 'panel') {
            currentUserAccessType = 'panel';
            const panelIdParam = urlParams.get('panel');
            if (panelIdParam) {
                currentUserRestrictedPanelId = parseInt(panelIdParam);
            }
        } else {
            currentUserAccessType = 'card';
            const demandId = urlParams.get('demand');
            const panelIdParam = urlParams.get('panel');
            if (demandId) {
                currentUserRestrictedDemandId = parseInt(demandId);
            }
            if (panelIdParam) {
                currentUserRestrictedPanelId = parseInt(panelIdParam);
            }
        }
    } else if (isInvite) {
        // Se já estiver autenticado mas veio de um link de convite, verificar tipo de acesso
        const accessType = urlParams.get('access') || 'card';
        if (accessType === 'panel') {
            currentUserAccessType = 'panel';
            const panelIdParam = urlParams.get('panel');
            if (panelIdParam) {
                currentUserRestrictedPanelId = parseInt(panelIdParam);
            }
        } else {
            currentUserAccessType = 'card';
            const demandId = urlParams.get('demand');
            const panelIdParam = urlParams.get('panel');
            if (demandId) {
                currentUserRestrictedDemandId = parseInt(demandId);
            }
            if (panelIdParam) {
                currentUserRestrictedPanelId = parseInt(panelIdParam);
            }
        }
    } else {
        // Usuário autenticado normalmente - acesso completo
        currentUserAccessType = 'full';
    }
    
    const demandId = urlParams.get('demand');
    const panelIdParam = urlParams.get('panel');
    
    // Aguardar um pouco para Firebase inicializar (se configurado)
    setTimeout(async () => {
        // Inicializar elementos DOM dos painéis
        panelSelector = document.getElementById('panel-selector');
        newPanelBtn = document.getElementById('new-panel-btn');
        managePanelsBtn = document.getElementById('manage-panels-btn');
        panelsModal = document.getElementById('panels-modal');
        closePanelsModalBtn = document.getElementById('close-panels-modal');
        panelFormModal = document.getElementById('panel-form-modal');
        closePanelFormModalBtn = document.getElementById('close-panel-form-modal');
        transferDemandModal = document.getElementById('transfer-demand-modal');
        closeTransferDemandModalBtn = document.getElementById('close-transfer-demand-modal');
        transferPanelSelect = document.getElementById('transfer-panel-select');
        cancelTransferDemandBtn = document.getElementById('cancel-transfer-demand-btn');
        confirmTransferDemandBtn = document.getElementById('confirm-transfer-demand-btn');
        panelForm = document.getElementById('panel-form');
        cancelPanelFormBtn = document.getElementById('cancel-panel-form-btn');
        createPanelBtn = document.getElementById('create-panel-btn');
        
        // Garantir que os dados estão limpos antes de carregar (isolamento por usuário)
        const currentUser = localStorage.getItem('qualishel_current_user');
        if (!currentUser) {
            console.error('❌ ERRO: Nenhum usuário autenticado! Não é possível carregar dados.');
            return;
        }
        
        const expectedUserId = currentUser.toLowerCase().replace(/\s+/g, '_');
        console.log(`👤 Carregando dados para usuário: ${currentUser} (userId: ${expectedUserId})`);
        
        // CRÍTICO: Fazer backup dos dados atuais antes de qualquer limpeza
        const backupPanels = [...panels];
        const backupDemands = [...demands];
        const backupCurrentPanelId = currentPanelId;
        const backupPanelCounter = panelIdCounter;
        const backupDemandCounter = demandIdCounter;
        
        console.log(`💾 Backup criado - Painéis: ${backupPanels.length}, Demandas: ${backupDemands.length}`);
        
        // Limpar APENAS chaves antigas (sem userId) do localStorage - NUNCA remover dados do usuário atual
        // CRÍTICO: NUNCA remover credenciais (qualishel_users, qualishel_authenticated, qualishel_current_user)
        console.log('🧹 Verificando chaves antigas do localStorage (sem userId)...');
        const userId = currentUser.toLowerCase().replace(/\s+/g, '_');
        const oldKeys = [
            'qualishel-panels', 'qualishel-panel-counter', 'qualishel-current-panel',
            'qualishel-demands', 'qualishel-demand-counter', 'qualishel-people'
        ];
        oldKeys.forEach(key => {
            // PROTEÇÃO ABSOLUTA: Nunca remover credenciais
            if (key === 'qualishel_users' || key === 'qualishel_authenticated' || key === 'qualishel_current_user') {
                console.log(`🔒 PROTEÇÃO ABSOLUTA: Credencial protegida - ${key}`);
                return; // Pular esta chave completamente
            }
            
            // APENAS remover se a chave existir E não houver uma chave com userId correspondente
            // Isso garante que não removemos dados válidos do usuário atual
            const userSpecificKey = key.includes('-counter') 
                ? `qualishel-${key.includes('panel') ? 'panel' : 'demand'}-counter-${userId}`
                : `${key}-${userId}`;
            const hasUserSpecificData = localStorage.getItem(userSpecificKey);
            
            if (localStorage.getItem(key) && !hasUserSpecificData) {
                // Só remover se não houver dados específicos do usuário (migração de dados antigos)
                console.log(`🗑️ Removendo chave antiga do localStorage (sem userId): ${key}`);
                localStorage.removeItem(key);
            } else if (localStorage.getItem(key) && hasUserSpecificData) {
                // Se houver dados específicos do usuário, manter ambos (dados antigos podem ser migrados depois)
                console.log(`ℹ️ Mantendo chave antiga ${key} (dados do usuário existem em ${userSpecificKey})`);
            }
        });
        
        // Limpar interface visual antes de carregar (mas manter dados na memória até confirmar carregamento)
        const columns = ['pendente', 'andamento', 'revisao', 'concluido'];
        columns.forEach(status => {
            const column = document.getElementById(`column-${status}`);
            if (column) {
                column.innerHTML = '';
            }
        });
        
        // Tentar carregar dados - se falhar, restaurar backup
        try {
            await loadPanels();
            await loadDemands();
            
            // Verificar se os dados foram carregados com sucesso
            if (panels.length === 0 && backupPanels.length > 0) {
                console.warn('⚠️ Nenhum painel carregado, mas havia backup. Restaurando backup...');
                panels = backupPanels;
                panelIdCounter = backupPanelCounter;
                currentPanelId = backupCurrentPanelId;
            }
            
            if (demands.length === 0 && backupDemands.length > 0) {
                console.warn('⚠️ Nenhuma demanda carregada, mas havia backup. Restaurando backup...');
                demands = backupDemands;
                demandIdCounter = backupDemandCounter;
            }
            
            // Se ainda não houver dados após tentar carregar, limpar memória apenas agora
            if (panels.length === 0 && demands.length === 0) {
                console.log('ℹ️ Nenhum dado encontrado. Limpando memória...');
                panels = [];
                demands = [];
                currentPanelId = null;
                panelIdCounter = 1;
                demandIdCounter = 1;
                availablePeople = [];
                isUpdatingFromRealtime = false;
            } else {
                // Dados carregados com sucesso, limpar apenas contadores se necessário
                if (panels.length > 0 && panelIdCounter < Math.max(...panels.map(p => p.id)) + 1) {
                    panelIdCounter = Math.max(...panels.map(p => p.id)) + 1;
                }
                if (demands.length > 0 && demandIdCounter < Math.max(...demands.map(d => d.id)) + 1) {
                    demandIdCounter = Math.max(...demands.map(d => d.id)) + 1;
                }
            }
        } catch (error) {
            console.error('❌ Erro ao carregar dados:', error);
            console.log('🔄 Restaurando backup devido a erro...');
            // Restaurar backup em caso de erro
            panels = backupPanels;
            demands = backupDemands;
            currentPanelId = backupCurrentPanelId;
            panelIdCounter = backupPanelCounter;
            demandIdCounter = backupDemandCounter;
        }
        
        console.log(`📊 Dados carregados - Painéis: ${panels.length}, Demandas: ${demands.length}`);
        // Corrigir cards sem panelId válido após carregar painéis
        fixCardsWithoutPanelId();
        renderPanelSelector();
        setupEventListeners();
        updateUserNameDisplay();
        renderKanban();
        updateCardCounts();
        setupReportListeners();
        loadEmailConfig();
        loadProductionUrl(); // Carregar URL de produção
        initializeEmailJS();
        
        // Configurar listeners em tempo real para sincronização automática
        // Aguardar um pouco para garantir que Firebase está pronto
        setTimeout(async () => {
            // Verificar se o usuário mudou durante o carregamento
            const currentUser = localStorage.getItem('qualishel_current_user');
            if (!currentUser) {
                console.warn('⚠️ Nenhum usuário autenticado. Sincronização em tempo real não será configurada.');
                return;
            }
            
            // Tentar configurar sincronização, se falhar, tentar novamente
            let retries = 0;
            const maxRetries = 5;
            
            const trySetupSync = async () => {
                // Verificar novamente se o usuário ainda é o mesmo
                const checkUser = localStorage.getItem('qualishel_current_user');
                if (checkUser !== currentUser) {
                    console.warn('⚠️ Usuário mudou durante configuração de sincronização. Cancelando...');
                    return;
                }
                
                // Verificar se Firebase está disponível
                if (typeof window.firebaseService !== 'undefined' && window.firebaseService.isInitialized()) {
                    console.log(`🔄 Configurando sincronização em tempo real para usuário: ${currentUser}`);
                    await setupRealtimeSync();
                    console.log('✅ Sincronização em tempo real configurada com sucesso');
                } else if (retries < maxRetries) {
                    retries++;
                    // Só mostrar mensagem a cada 2 tentativas para não poluir o console
                    if (retries % 2 === 0) {
                        console.log(`Tentando configurar sincronização... (tentativa ${retries}/${maxRetries})`);
                    }
                    setTimeout(trySetupSync, 1000);
                } else {
                    // Verificar se Firebase está configurado mas não inicializado
                    if (typeof window.db === 'undefined') {
                        console.info('ℹ️ Firebase não configurado. Usando localStorage apenas. Para sincronização, configure o Firebase.');
                    } else {
                        console.warn('⚠️ Firebase configurado mas não inicializado. Verifique a configuração.');
                    }
                }
            };
            
            await trySetupSync();
        }, 1000);
        
        // Reconectar listeners quando a página ganha foco novamente
        let reconnectTimeout = null;
        document.addEventListener('visibilitychange', async () => {
            if (!document.hidden && typeof window.firebaseService !== 'undefined' && window.firebaseService.isInitialized()) {
                // Limpar timeout anterior se existir
                if (reconnectTimeout) {
                    clearTimeout(reconnectTimeout);
                }
                console.log('🔄 Página visível novamente - verificando sincronização...');
                // Aguardar um pouco antes de reconectar para evitar reconexões desnecessárias
                reconnectTimeout = setTimeout(async () => {
                    const currentUser = localStorage.getItem('qualishel_current_user');
                    if (currentUser && typeof window.firebaseService !== 'undefined' && window.firebaseService.isInitialized()) {
                        // Remover listeners antigos antes de criar novos
                        window.firebaseService.removeAllListeners();
                        await setupRealtimeSync();
                        console.log('✅ Sincronização reconectada após página ganhar foco');
                    }
                }, 1000); // Aumentar delay para evitar reconexões muito frequentes
            }
        });
        
        // Reconectar quando a janela ganha foco (útil para tablets/desktop)
        let focusReconnectTimeout = null;
        window.addEventListener('focus', async () => {
            if (typeof window.firebaseService !== 'undefined' && window.firebaseService.isInitialized()) {
                // Limpar timeout anterior se existir
                if (focusReconnectTimeout) {
                    clearTimeout(focusReconnectTimeout);
                }
                console.log('🔄 Janela ganhou foco - verificando sincronização...');
                focusReconnectTimeout = setTimeout(async () => {
                    const currentUser = localStorage.getItem('qualishel_current_user');
                    if (currentUser && typeof window.firebaseService !== 'undefined' && window.firebaseService.isInitialized()) {
                        // Remover listeners antigos antes de criar novos
                        window.firebaseService.removeAllListeners();
                        await setupRealtimeSync();
                        console.log('✅ Sincronização reconectada após janela ganhar foco');
                    }
                }, 1000); // Aumentar delay para evitar reconexões muito frequentes
            }
        });
        
        // Se for um convite, mostrar mensagem e focar na demanda
        // Aguardar carregamento completo dos dados antes de processar convite
        if (isInvite && demandId) {
            const invitePanelId = panelIdParam ? parseInt(panelIdParam) : null;
            const inviteDemandId = parseInt(demandId);
            
            // Função para aguardar dados carregarem e então processar convite
            const waitForDataAndProcessInvite = async (attempts = 0) => {
                const maxWaitAttempts = 20; // Aguardar até 10 segundos
                
                // Verificar se os dados foram carregados
                const hasData = demands.length > 0 || 
                               (typeof window.firebaseService !== 'undefined' && 
                                window.firebaseService.isInitialized());
                
                // Verificar se a demanda específica existe
                const demandExists = demands.find(d => d.id === inviteDemandId);
                
                if (demandExists) {
                    // Demanda encontrada, processar convite
                    console.log('✅ Demanda encontrada, processando convite...');
                    handleInviteAccess(inviteDemandId, invitePanelId);
                } else if (attempts < maxWaitAttempts) {
                    // Ainda não encontrou, aguardar mais
                    console.log(`⏳ Aguardando dados carregarem... (tentativa ${attempts + 1}/${maxWaitAttempts})`);
                    setTimeout(() => waitForDataAndProcessInvite(attempts + 1), 500);
                } else {
                    // Timeout - salvar como convite pendente e tentar quando dados chegarem
                    console.warn('⚠️ Timeout aguardando dados. Salvando convite como pendente...');
                    pendingInvite = { demandId: inviteDemandId, panelId: invitePanelId };
                    // Tentar mesmo assim (pode estar em outro dispositivo ou dados podem chegar depois)
                    handleInviteAccess(inviteDemandId, invitePanelId);
                }
            };
            
            // Iniciar espera após um pequeno delay inicial
            setTimeout(() => {
                waitForDataAndProcessInvite();
            }, 1000);
        }
    }, 100);
});

// Função para lidar com acesso via convite
function handleInviteAccess(demandId, panelId = null, retryCount = 0) {
    const maxRetries = 20; // Tentar até 20 vezes (10 segundos)
    
    // Converter demandId para número se necessário
    const numericDemandId = typeof demandId === 'string' ? parseInt(demandId) : demandId;
    
    console.log(`🔍 Procurando demanda ID: ${numericDemandId} (tipo: ${typeof numericDemandId})`);
    console.log(`📊 Total de demandas carregadas: ${demands.length}`);
    if (demands.length > 0) {
        console.log(`📋 IDs das demandas disponíveis:`, demands.map(d => `${d.id} (${typeof d.id})`));
    }
    
    const demand = demands.find(d => {
        // Comparação flexível - aceitar tanto string quanto número
        const demandIdNum = typeof d.id === 'string' ? parseInt(d.id) : d.id;
        return demandIdNum === numericDemandId || d.id === numericDemandId;
    });
    
    if (!demand) {
        // Demanda não encontrada - pode ainda estar carregando do Firebase
        if (retryCount < maxRetries) {
            console.log(`⏳ Aguardando demanda ${numericDemandId} carregar... (tentativa ${retryCount + 1}/${maxRetries})`);
            console.log(`📊 Demandas atuais: ${demands.length}`);
            setTimeout(() => handleInviteAccess(numericDemandId, panelId, retryCount + 1), 500);
            return;
        } else {
            console.error(`❌ Demanda ${numericDemandId} não encontrada após ${maxRetries} tentativas`);
            console.error(`📊 Total de demandas: ${demands.length}`);
            console.error(`📋 IDs disponíveis:`, demands.map(d => d.id));
            
            // Mensagem mais informativa
            const errorMsg = `Demanda não encontrada (ID: ${numericDemandId}).\n\n` +
                           `Total de demandas carregadas: ${demands.length}\n` +
                           `Verifique se o link está correto ou se você tem acesso.`;
            alert(errorMsg);
            return;
        }
    }
    
    console.log('✅ Demanda encontrada:', demand.title);
    
    // Selecionar o painel correto - priorizar panelId do link, depois panelId da demanda
    let targetPanelId = panelId;
    
    // Se não veio no link, usar o painel da demanda
    if (!targetPanelId && demand.panelId) {
        targetPanelId = demand.panelId;
    }
    
    // Se ainda não tem, usar o painel atual
    if (!targetPanelId) {
        targetPanelId = currentPanelId;
    }
    
    // Selecionar o painel se for diferente do atual
    if (targetPanelId && targetPanelId !== currentPanelId) {
        currentPanelId = targetPanelId;
        savePanels();
        
        // Atualizar o seletor e renderizar o Kanban com o painel correto
        renderPanelSelector();
        renderKanban();
        updateCardCounts();
        updateDashboard();
    } else if (!targetPanelId) {
        // Se não há painel, renderizar mesmo assim
        renderKanban();
        updateCardCounts();
    } else {
        // Se o painel já está correto, garantir que o Kanban está renderizado
        renderKanban();
        updateCardCounts();
    }
    
    // Obter informações do painel
    const panel = panels.find(p => p.id === targetPanelId);
    
    // Determinar tipo de acesso e mensagem apropriada
    const accessType = currentUserAccessType || 'card';
    const accessTypeLabel = accessType === 'panel' ? 'Painel Completo' : 'Apenas este Card';
    const accessTypeDescription = accessType === 'panel' 
        ? 'Você tem acesso a todo o painel e pode ver e colaborar em todas as demandas.'
        : 'Você tem acesso apenas a este card específico e não pode ver outras demandas do painel.';
    
    // Mostrar notificação de boas-vindas
    const welcomeMessage = `
        <div style="padding: 1rem;">
            <h3 style="margin-bottom: 0.5rem; color: var(--primary-color);">👋 Bem-vindo ao Qualishel!</h3>
            <p style="margin-bottom: 1rem;">Você foi convidado para colaborar na demanda:</p>
            <div style="background: var(--bg-color); padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                <strong>${demand.title}</strong>
                <p style="margin-top: 0.5rem; color: var(--text-secondary); font-size: 0.875rem;">${demand.description || 'Sem descrição'}</p>
            </div>
            ${panel ? `<p style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.5rem;"><strong>Painel:</strong> ${panel.name}</p>` : ''}
            <div style="background: #fef3c7; padding: 0.75rem; border-radius: 6px; margin-bottom: 1rem; border-left: 3px solid #f59e0b;">
                <p style="font-size: 0.875rem; margin: 0; color: #92400e;"><strong>Permissão:</strong> ${accessTypeLabel}</p>
                <p style="font-size: 0.75rem; margin-top: 0.5rem; color: #78350f;">${accessTypeDescription}</p>
            </div>
            <p style="font-size: 0.875rem; color: var(--text-secondary);">
                Navegue até o card no Kanban para ver detalhes e colaborar!
            </p>
        </div>
    `;
    
    // Criar modal de boas-vindas
    const welcomeModal = document.createElement('div');
    welcomeModal.className = 'modal active';
    welcomeModal.id = 'welcome-modal';
    welcomeModal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h3>Bem-vindo!</h3>
                <button class="close-btn" onclick="closeWelcomeModal()">×</button>
            </div>
            <div class="modal-body">
                ${welcomeMessage}
            </div>
            <div class="modal-footer">
                <button class="btn-primary" onclick="closeWelcomeModalAndFocusDemand(${demandId})">
                    Ver Demanda
                </button>
                <button class="btn-secondary" onclick="closeWelcomeModal()">
                    Fechar
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(welcomeModal);
    document.body.style.overflow = 'hidden';
    
    // Função para focar no card - tentar várias vezes até encontrar
    const focusOnCard = (attempts = 0) => {
        const maxAttempts = 10;
        const card = document.querySelector(`[data-id="${demandId}"]`);
        
        if (card) {
            // Scroll suave até o card
            card.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
            
            // Destacar o card
            card.style.transition = 'box-shadow 0.3s ease';
            card.style.boxShadow = '0 0 20px rgba(37, 99, 235, 0.5)';
            card.style.zIndex = '10';
            card.style.position = 'relative';
            
            // Remover destaque após 3 segundos
            setTimeout(() => {
                card.style.boxShadow = '';
                card.style.zIndex = '';
                card.style.position = '';
            }, 3000);
            
            console.log('✅ Card encontrado e destacado:', demandId);
        } else if (attempts < maxAttempts) {
            // Se não encontrou, tentar novamente após um delay
            setTimeout(() => {
                console.log(`Tentando encontrar card ${demandId}... (tentativa ${attempts + 1}/${maxAttempts})`);
                focusOnCard(attempts + 1);
            }, 300);
        } else {
            console.warn('⚠️ Card não encontrado após várias tentativas:', demandId);
        }
    };
    
    // Tentar focar no card após um pequeno delay para garantir que o DOM foi renderizado
    setTimeout(() => {
        focusOnCard();
    }, 500);
}

// Funções globais para o modal de boas-vindas
window.closeWelcomeModal = function() {
    const modal = document.getElementById('welcome-modal');
    if (modal) {
        modal.remove();
        document.body.style.overflow = '';
    }
};

window.closeWelcomeModalAndFocusDemand = function(demandId) {
    closeWelcomeModal();
    
    // Focar na demanda - tentar várias vezes até encontrar
    const focusOnDemand = (attempts = 0) => {
        const maxAttempts = 15;
        const card = document.querySelector(`[data-id="${demandId}"]`);
        
        if (card) {
            // Scroll suave até o card
            card.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
            
            // Destacar o card
            card.style.transition = 'box-shadow 0.3s ease';
            card.style.boxShadow = '0 0 20px rgba(37, 99, 235, 0.5)';
            card.style.zIndex = '10';
            card.style.position = 'relative';
            
            // Aguardar um pouco e abrir modal de tarefas/chat
            setTimeout(() => {
                // Abrir modal de tarefas/chat automaticamente
                if (typeof openTasksChat === 'function') {
                    openTasksChat(demandId);
                }
                
                // Remover destaque após 3 segundos
                setTimeout(() => {
                    card.style.boxShadow = '';
                    card.style.zIndex = '';
                    card.style.position = '';
                }, 2000);
            }, 500);
            
            console.log('✅ Card encontrado e modal aberto:', demandId);
        } else if (attempts < maxAttempts) {
            // Se não encontrou, tentar novamente após um delay
            setTimeout(() => {
                console.log(`Tentando encontrar card ${demandId}... (tentativa ${attempts + 1}/${maxAttempts})`);
                focusOnDemand(attempts + 1);
            }, 300);
        } else {
            console.warn('⚠️ Card não encontrado após várias tentativas:', demandId);
            // Mesmo sem encontrar o card, tentar abrir o modal
            if (typeof openTasksChat === 'function') {
                openTasksChat(demandId);
            }
        }
    };
    
    // Iniciar tentativas de focar no card
    setTimeout(() => {
        focusOnDemand();
    }, 300);
};

// Atualizar exibição do nome do usuário no Kanban
function updateUserNameDisplay() {
    const userNameElement = document.getElementById('kanban-user-name');
    if (userNameElement) {
        const currentUser = localStorage.getItem('qualishel_current_user');
        if (currentUser) {
            // Buscar nome completo do usuário se disponível
            const users = JSON.parse(localStorage.getItem('qualishel_users') || '[]');
            const user = users.find(u => u.username === currentUser);
            const displayName = user && user.name ? user.name : currentUser;
            userNameElement.textContent = displayName;
        } else {
            userNameElement.textContent = 'Usuário não identificado';
        }
    }
}

// Event Listeners
// Função para fazer logout
function handleLogout() {
    if (confirm('Tem certeza que deseja sair?')) {
        localStorage.removeItem('qualishel_authenticated');
        localStorage.removeItem('qualishel_current_user');
        window.location.href = 'homepage.html';
    }
}

function setupEventListeners() {
    // Botão de logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleLogout();
        });
    }
    // Modal de Demanda
    addDemandBtn.addEventListener('click', () => openModal());
    closeModalBtn.addEventListener('click', () => closeModal());
    cancelBtn.addEventListener('click', () => closeModal());
    demandModal.addEventListener('click', (e) => {
        if (e.target === demandModal) closeModal();
    });

    if (gutTriggerBtn) {
        gutTriggerBtn.addEventListener('click', handleGutTrigger);
    }
    if (gutCancelBtn) {
        gutCancelBtn.addEventListener('click', handleGutCancel);
    }
    if (gutApplyBtn) {
        gutApplyBtn.addEventListener('click', handleGutApply);
    }
    if (gutClearBtn) {
        gutClearBtn.addEventListener('click', () => clearGutSelection({ resetSelectValue: false }));
    }
    if (gutInputs && gutInputs.length > 0) {
        gutInputs.forEach(input => {
            input.addEventListener('input', handleGutInput);
        });
    }
    if (demandPrioritySelect) {
        demandPrioritySelect.addEventListener('change', () => {
            currentPriorityMode = 'manual';
            setPriorityUiForManual({ resetSelectValue: false });
        });
    }

    // 5W2H Toggle
    const enable5W2HCheckbox = document.getElementById('enable-5w2h');
    if (enable5W2HCheckbox) {
        enable5W2HCheckbox.addEventListener('change', (e) => {
            toggleW5H2Panel(e.target.checked);
        });
    }
    
    // PDSA Toggle
    const enablePDSACheckbox = document.getElementById('enable-pdsa');
    if (enablePDSACheckbox) {
        enablePDSACheckbox.addEventListener('change', (e) => {
            togglePDSAPanel(e.target.checked);
        });
    }

    // Modal de Prazo
    closeDeadlineModalBtn.addEventListener('click', () => closeDeadlineModal());
    cancelDeadlineBtn.addEventListener('click', () => closeDeadlineModal());
    deadlineModal.addEventListener('click', (e) => {
        if (e.target === deadlineModal) closeDeadlineModal();
    });
    deadlineForm.addEventListener('submit', handleDeadlineSubmit);

    // Modal de Colaboradores
    closeCollaboratorsModalBtn.addEventListener('click', () => closeCollaboratorsModal());
    cancelCollaboratorsBtn.addEventListener('click', () => closeCollaboratorsModal());
    collaboratorsModal.addEventListener('click', (e) => {
        if (e.target === collaboratorsModal) closeCollaboratorsModal();
    });
    addCollaboratorBtn.addEventListener('click', handleAddCollaborator);
    
    // Configuração de Email (no modal de colaboradores)
    const saveEmailConfigBtn = document.getElementById('save-email-config-btn');
    if (saveEmailConfigBtn) {
        saveEmailConfigBtn.addEventListener('click', saveEmailConfig);
    }

    // Configuração de Email (na página de configurações)
    const settingsSaveEmailConfigBtn = document.getElementById('settings-save-email-config-btn');
    if (settingsSaveEmailConfigBtn) {
        settingsSaveEmailConfigBtn.addEventListener('click', saveEmailConfigFromSettings);
    }

    const testEmailBtn = document.getElementById('test-email-btn');
    if (testEmailBtn) {
        testEmailBtn.addEventListener('click', testEmailSend);
    }

    const testInviteLinkBtn = document.getElementById('test-invite-link-btn');
    if (testInviteLinkBtn) {
        testInviteLinkBtn.addEventListener('click', testInviteLink);
    }

    // Modal de Relatório do Card
    const closeCardReportModalBtn = document.getElementById('close-card-report-modal');
    const cardReportModal = document.getElementById('card-report-modal');
    const cardReportPrintBtn = document.getElementById('card-report-print-btn');
    const cardReportPdfBtn = document.getElementById('card-report-pdf-btn');
    
    if (closeCardReportModalBtn) {
        closeCardReportModalBtn.addEventListener('click', closeCardReportModal);
    }
    if (cardReportModal) {
        cardReportModal.addEventListener('click', (e) => {
            if (e.target === cardReportModal) closeCardReportModal();
        });
    }
    if (cardReportPrintBtn) {
        cardReportPrintBtn.addEventListener('click', printCardReport);
    }
    if (cardReportPdfBtn) {
        cardReportPdfBtn.addEventListener('click', generateCardReportPDFFromModal);
    }

    // Modal de Visualização do 5W2H
    const closeW5H2ViewModalBtn = document.getElementById('close-w5h2-view-modal');
    const w5h2ViewModal = document.getElementById('w5h2-view-modal');

    if (closeW5H2ViewModalBtn) {
        closeW5H2ViewModalBtn.addEventListener('click', closeW5H2ViewModal);
    }
    if (w5h2ViewModal) {
        w5h2ViewModal.addEventListener('click', (e) => {
            if (e.target === w5h2ViewModal) closeW5H2ViewModal();
        });
    }
    
    // Modal de Visualização do PDSA
    const closePDSViewModalBtn = document.getElementById('close-pdsa-view-modal');
    const pdsaViewModal = document.getElementById('pdsa-view-modal');

    if (closePDSViewModalBtn) {
        closePDSViewModalBtn.addEventListener('click', closePDSViewModal);
    }
    if (pdsaViewModal) {
        pdsaViewModal.addEventListener('click', (e) => {
            if (e.target === pdsaViewModal) closePDSViewModal();
        });
    }

    // Configuração de URL de Produção
    const saveProductionUrlBtn = document.getElementById('save-production-url-btn');
    if (saveProductionUrlBtn) {
        saveProductionUrlBtn.addEventListener('click', saveProductionUrl);
    }
    
    const testProductionUrlBtn = document.getElementById('test-production-url-btn');
    if (testProductionUrlBtn) {
        testProductionUrlBtn.addEventListener('click', testProductionUrl);
    }

    // Configuração de Usuário
    const saveUserNameBtn = document.getElementById('save-user-name-btn');
    if (saveUserNameBtn) {
        saveUserNameBtn.addEventListener('click', saveUserName);
    }

    // Configuração do Google Calendar
    const connectGoogleCalendarBtn = document.getElementById('connect-google-calendar-btn');
    if (connectGoogleCalendarBtn) {
        connectGoogleCalendarBtn.addEventListener('click', connectGoogleCalendar);
    }

    const disconnectGoogleCalendarBtn = document.getElementById('disconnect-google-calendar-btn');
    if (disconnectGoogleCalendarBtn) {
        disconnectGoogleCalendarBtn.addEventListener('click', disconnectGoogleCalendar);
    }

    const saveGoogleCalendarClientIdBtn = document.getElementById('save-google-calendar-client-id-btn');
    if (saveGoogleCalendarClientIdBtn) {
        saveGoogleCalendarClientIdBtn.addEventListener('click', saveGoogleCalendarClientId);
    }

    // Modal de Tarefas e Chat
    closeTasksChatModalBtn.addEventListener('click', () => closeTasksChatModal());
    tasksChatModal.addEventListener('click', (e) => {
        if (e.target === tasksChatModal) closeTasksChatModal();
    });
    addTaskBtn.addEventListener('click', handleAddTask);
    sendChatBtn.addEventListener('click', handleSendChat);
    
    // Enter para enviar mensagem
    const chatInput = document.getElementById('chat-message-input');
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSendChat();
            }
        });
    }

    // Enter para adicionar tarefa
    const taskInput = document.getElementById('new-task-input');
    if (taskInput) {
        taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleAddTask();
            }
        });
    }

    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.getAttribute('data-tab');
            switchTab(tab);
        });
    });

    // Painéis
    if (panelSelector) {
        panelSelector.addEventListener('change', handlePanelChange);
        
        // Inicializar dropdown customizado
        initCustomPanelDropdown();
    }
    if (newPanelBtn) {
        newPanelBtn.addEventListener('click', () => openPanelFormModal());
    }
    if (managePanelsBtn) {
        managePanelsBtn.addEventListener('click', () => openPanelsModal());
    }
    if (closePanelsModalBtn) {
        closePanelsModalBtn.addEventListener('click', () => closePanelsModal());
    }
    if (closePanelFormModalBtn) {
        closePanelFormModalBtn.addEventListener('click', () => closePanelFormModal());
    }
    if (cancelPanelFormBtn) {
        cancelPanelFormBtn.addEventListener('click', () => closePanelFormModal());
    }
    if (createPanelBtn) {
        createPanelBtn.addEventListener('click', () => openPanelFormModal());
    }
    if (panelForm) {
        panelForm.addEventListener('submit', handlePanelFormSubmit);
    }
    if (panelsModal) {
        panelsModal.addEventListener('click', (e) => {
            if (e.target === panelsModal) closePanelsModal();
        });
    }
    if (closeTransferDemandModalBtn) {
        closeTransferDemandModalBtn.addEventListener('click', () => closeTransferDemandModal());
    }
    if (transferDemandModal) {
        transferDemandModal.addEventListener('click', (e) => {
            if (e.target === transferDemandModal) closeTransferDemandModal();
        });
    }
    if (cancelTransferDemandBtn) {
        cancelTransferDemandBtn.addEventListener('click', () => closeTransferDemandModal());
    }
    if (confirmTransferDemandBtn) {
        confirmTransferDemandBtn.addEventListener('click', () => confirmTransferDemand());
    }
    if (panelFormModal) {
        panelFormModal.addEventListener('click', (e) => {
            if (e.target === panelFormModal) closePanelFormModal();
        });
    }

    // Formulário
    demandForm.onsubmit = handleFormSubmit;

    // Navegação
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.getAttribute('data-page');
            switchPage(page);
        });
    });

    // Drag and Drop
    setupDragAndDrop();
}

// Modal
function openModal() {
    demandModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    // Garantir que o título e botão estão corretos para criar nova demanda
    document.querySelector('.modal-header h3').textContent = 'Nova Demanda';
    const submitBtn = document.getElementById('submit-demand-btn');
    if (submitBtn) {
        submitBtn.textContent = 'Criar Demanda';
    }
    resetPriorityControls({ resetSelectValue: true });
}

function closeModal() {
    demandModal.classList.remove('active');
    document.body.style.overflow = '';
    demandForm.reset();
    resetPriorityControls({ resetSelectValue: true });
    
    // Limpar campos 5W2H
    const enableCheckbox = document.getElementById('enable-5w2h');
    if (enableCheckbox) {
        enableCheckbox.checked = false;
        toggleW5H2Panel(false);
    }
    
    // Limpar campos PDSA
    const enablePDSACheckbox = document.getElementById('enable-pdsa');
    if (enablePDSACheckbox) {
        enablePDSACheckbox.checked = false;
        togglePDSAPanel(false);
    }
    
    document.querySelector('.modal-header h3').textContent = 'Nova Demanda';
    // Restaurar texto do botão para criar nova demanda
    const submitBtn = document.getElementById('submit-demand-btn');
    if (submitBtn) {
        submitBtn.textContent = 'Criar Demanda';
    }
    // Restaurar comportamento padrão do formulário
    demandForm.onsubmit = handleFormSubmit;
}

// Funções 5W2H
function toggleW5H2Panel(show) {
    const panel = document.getElementById('w5h2-panel');
    if (!panel) return;
    
    if (show) {
        panel.classList.add('is-open');
        panel.removeAttribute('hidden');
    } else {
        panel.classList.remove('is-open');
        panel.setAttribute('hidden', 'true');
    }
}

// Funções PDSA
function togglePDSAPanel(show) {
    const panel = document.getElementById('pdsa-panel');
    if (!panel) return;
    
    if (show) {
        panel.classList.add('is-open');
        panel.removeAttribute('hidden');
    } else {
        panel.classList.remove('is-open');
        panel.setAttribute('hidden', 'true');
    }
}

window.toggleW5H2Expand = function(demandId) {
    const content = document.getElementById(`w5h2-content-${demandId}`);
    const header = document.querySelector(`#w5h2-content-${demandId}`)?.closest('.card-w5h2')?.querySelector('.w5h2-card-header');
    if (!content || !header) return;
    
    const isExpanded = content.classList.contains('expanded');
    const toggle = header.querySelector('.w5h2-card-toggle');
    
    if (isExpanded) {
        content.classList.remove('expanded');
        if (toggle) toggle.textContent = '▼';
    } else {
        content.classList.add('expanded');
        if (toggle) toggle.textContent = '▲';
    }
};

// Abrir modal de visualização do 5W2H
window.openW5H2ViewModal = function(demandId) {
    const demand = demands.find(d => d.id === demandId);
    if (!demand || !demand.w5h2 || !demand.w5h2.enabled) {
        return;
    }
    
    const modal = document.getElementById('w5h2-view-modal');
    const content = document.getElementById('w5h2-view-content');
    
    if (!modal || !content) return;
    
    // Renderizar conteúdo do 5W2H
    renderW5H2ViewContent(demand.w5h2, content);
    
    // Abrir modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
};

function renderW5H2ViewContent(w5h2, container) {
    const w5h2Fields = [
        { label: 'O quê? (What)', value: w5h2.what, icon: '🎯', description: 'O que será feito? Descreva a ação ou atividade.' },
        { label: 'Quem? (Who)', value: w5h2.who, icon: '👤', description: 'Quem será responsável? Liste as pessoas ou equipes.' },
        { label: 'Quando? (When)', value: w5h2.when, icon: '📅', description: 'Quando será realizado? Defina prazos e cronograma.' },
        { label: 'Onde? (Where)', value: w5h2.where, icon: '📍', description: 'Onde será executado? Especifique localização física ou virtual.' },
        { label: 'Por quê? (Why)', value: w5h2.why, icon: '❓', description: 'Por que será feito? Explique o motivo e a justificativa.' },
        { label: 'Como? (How)', value: w5h2.how, icon: '⚙️', description: 'Como será executado? Descreva o método, processo ou abordagem.' },
        { label: 'Quanto custa? (How Much)', value: w5h2.howMuch, icon: '💰', description: 'Qual o custo estimado? Informe recursos financeiros, tempo ou outros investimentos.' }
    ];
    
    let html = `
        <div class="w5h2-view-container">
            <div class="w5h2-view-header">
                <div class="w5h2-view-brand">
                    <h2>📊 Análise 5W2H</h2>
                    <p>Ferramenta de qualidade para análise completa de demandas</p>
                </div>
            </div>
            
            <div class="w5h2-view-grid">
    `;
    
    w5h2Fields.forEach(field => {
        html += `
            <div class="w5h2-view-item ${field.value ? 'has-content' : 'empty'}">
                <div class="w5h2-view-item-header">
                    <span class="w5h2-view-icon">${field.icon}</span>
                    <div class="w5h2-view-title-section">
                        <h4 class="w5h2-view-title">${field.label}</h4>
                        <p class="w5h2-view-description">${field.description}</p>
                    </div>
                </div>
                <div class="w5h2-view-item-content">
                    ${field.value ? `
                        <div class="w5h2-view-value">${escapeHtml(field.value).replace(/\n/g, '<br>')}</div>
                    ` : `
                        <div class="w5h2-view-empty">
                            <span class="empty-icon">—</span>
                            <span class="empty-text">Não preenchido</span>
                        </div>
                    `}
                </div>
            </div>
        `;
    });
    
    html += `
            </div>
            
            <div class="w5h2-view-summary">
                <div class="summary-item">
                    <span class="summary-label">Campos preenchidos:</span>
                    <span class="summary-value">${w5h2Fields.filter(f => f.value).length} de ${w5h2Fields.length}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Status:</span>
                    <span class="summary-value ${w5h2Fields.filter(f => f.value).length === w5h2Fields.length ? 'complete' : 'partial'}">
                        ${w5h2Fields.filter(f => f.value).length === w5h2Fields.length ? '✓ Completo' : '○ Parcial'}
                    </span>
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

function closeW5H2ViewModal() {
    const modal = document.getElementById('w5h2-view-modal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Abrir modal de visualização do PDSA
window.openPDSViewModal = function(demandId) {
    const demand = demands.find(d => d.id === demandId);
    if (!demand || !demand.pdsa || !demand.pdsa.enabled) {
        return;
    }
    
    const modal = document.getElementById('pdsa-view-modal');
    const content = document.getElementById('pdsa-view-content');
    
    if (!modal || !content) return;
    
    // Renderizar conteúdo do PDSA
    renderPDSViewContent(demand.pdsa, content);
    
    // Abrir modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
};

function renderPDSViewContent(pdsa, container) {
    const pdsaFields = [
        { 
            label: 'Plan (Planejar)', 
            value: pdsa.plan, 
            icon: '📋', 
            description: 'Descreva o objetivo, a mudança sendo testada, as previsões e os passos de ação necessários. Planeje a coleta de dados.',
            color: '#2563eb' // Azul escuro
        },
        { 
            label: 'Do (Fazer)', 
            value: pdsa.do, 
            icon: '⚡', 
            description: 'Execute o teste. Descreva o que aconteceu. Colete os dados.',
            color: '#1e40af' // Azul mais escuro
        },
        { 
            label: 'Study (Estudar)', 
            value: pdsa.study, 
            icon: '🔍', 
            description: 'Analise os dados. Compare os resultados com as previsões. Resuma o que você aprendeu.',
            color: '#3b82f6' // Azul médio
        },
        { 
            label: 'Act (Agir)', 
            value: pdsa.act, 
            icon: '✅', 
            description: 'Decida o que fazer a seguir. Faça mudanças e inicie outro ciclo.',
            color: '#6b7280' // Cinza
        }
    ];
    
    let html = `
        <div class="pdsa-view-container">
            <div class="pdsa-view-header">
                <div class="pdsa-view-brand">
                    <h2>🔄 Ciclo PDSA</h2>
                    <p>Plan-Do-Study-Act: Método iterativo de resolução de problemas e melhoria contínua</p>
                </div>
            </div>
            
            <div class="pdsa-diagram-container">
                <div class="pdsa-diagram">
    `;
    
    // Criar os 4 quadrantes do diagrama PDSA
    // Ordem: Plan (top-right), Do (bottom-right), Study (bottom-left), Act (top-left)
    const quadrantOrder = ['plan', 'do', 'study', 'act'];
    const positions = ['top-right', 'bottom-right', 'bottom-left', 'top-left'];
    
    quadrantOrder.forEach((fieldKey, index) => {
        const field = pdsaFields.find(f => f.label.toLowerCase().includes(fieldKey));
        const position = positions[index];
        
        html += `
            <div class="pdsa-quadrant pdsa-${position}" style="background: ${field.color}20; border-color: ${field.color};">
                <div class="pdsa-quadrant-header">
                    <span class="pdsa-quadrant-icon">${field.icon}</span>
                    <h3 class="pdsa-quadrant-title">${field.label}</h3>
                </div>
                <div class="pdsa-quadrant-description">
                    ${field.description}
                </div>
                <div class="pdsa-quadrant-content">
                    ${field.value ? `
                        <div class="pdsa-quadrant-value">${escapeHtml(field.value).replace(/\n/g, '<br>')}</div>
                    ` : `
                        <div class="pdsa-quadrant-empty">
                            <span class="empty-icon">—</span>
                            <span class="empty-text">Não preenchido</span>
                        </div>
                    `}
                </div>
            </div>
        `;
    });
    
    html += `
                </div>
            </div>
            
            <div class="pdsa-view-summary">
                <div class="summary-item">
                    <span class="summary-label">Etapas preenchidas:</span>
                    <span class="summary-value">${pdsaFields.filter(f => f.value).length} de ${pdsaFields.length}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Status:</span>
                    <span class="summary-value ${pdsaFields.filter(f => f.value).length === pdsaFields.length ? 'complete' : 'partial'}">
                        ${pdsaFields.filter(f => f.value).length === pdsaFields.length ? '✓ Completo' : '○ Parcial'}
                    </span>
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

function closePDSViewModal() {
    const modal = document.getElementById('pdsa-view-modal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Navegação
function switchPage(pageName) {
    // Remover active de todas as páginas e links
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    navLinks.forEach(link => link.classList.remove('active'));

    // Adicionar active na página e link selecionados
    document.getElementById(`${pageName}-page`).classList.add('active');
    document.querySelector(`[data-page="${pageName}"]`).classList.add('active');

    // Atualizar conteúdo quando mudar de página
    if (pageName === 'arquivos') {
        renderArchives();
    }
    if (pageName === 'dashboard') {
        updateDashboard();
    } else if (pageName === 'relatorios') {
        // Garantir que seletores de painéis estejam atualizados
        renderReportPanelSelector();
        renderPanelCheckboxes();
        // Atualizar relatórios (agora é async)
        updateReports().catch(err => {
            console.error('Erro ao atualizar relatórios:', err);
        });
    } else if (pageName === 'configuracoes') {
        loadSettingsPage();
    }
}

// Formulário
function handleFormSubmit(e) {
    e.preventDefault();

    // Verificar se há painel selecionado
    if (!currentPanelId) {
        alert('Por favor, selecione um painel antes de criar uma demanda.');
        return;
    }

    const priorityData = extractPriorityData();

    // Coletar dados 5W2H
    const w5h2Data = {
        enabled: document.getElementById('enable-5w2h')?.checked || false,
        what: document.getElementById('w5h2-what')?.value || '',
        who: document.getElementById('w5h2-who')?.value || '',
        when: document.getElementById('w5h2-when')?.value || '',
        where: document.getElementById('w5h2-where')?.value || '',
        why: document.getElementById('w5h2-why')?.value || '',
        how: document.getElementById('w5h2-how')?.value || '',
        howMuch: document.getElementById('w5h2-howmuch')?.value || ''
    };
    
    // Coletar dados PDSA
    const pdsaData = {
        enabled: document.getElementById('enable-pdsa')?.checked || false,
        plan: document.getElementById('pdsa-plan')?.value || '',
        do: document.getElementById('pdsa-do')?.value || '',
        study: document.getElementById('pdsa-study')?.value || '',
        act: document.getElementById('pdsa-act')?.value || ''
    };

    const demand = {
        id: demandIdCounter++,
        panelId: currentPanelId, // Associar demanda ao painel atual
        title: document.getElementById('demand-title').value,
        description: document.getElementById('demand-description').value,
        w5h2: w5h2Data.enabled ? w5h2Data : null,
        pdsa: pdsaData.enabled ? pdsaData : null,
        priority: priorityData.priority,
        priorityStrategy: priorityData.priorityStrategy,
        gut: priorityData.gut,
        responsible: document.getElementById('demand-responsible').value || 'Não atribuído',
        status: document.getElementById('demand-status').value,
        createdAt: new Date().toISOString(),
        collaborators: [],
        tasks: [],
        chat: [],
        history: [] // Histórico de mudanças para rastreabilidade
    };
    
    // Adicionar entrada inicial no histórico
    demand.history.push({
        action: 'created',
        timestamp: new Date().toISOString(),
        user: localStorage.getItem('qualishel_current_user') || 'Sistema',
        details: {
            title: demand.title,
            status: demand.status,
            priority: demand.priority,
            priorityStrategy: demand.priorityStrategy
        }
    });

    demands.push(demand);
    saveDemands();
    renderKanban();
    updateCardCounts();
    updateDashboard(); // Atualizar dashboard se estiver visível
    closeModal();
}
// Renderização do Kanban
// Função para verificar se usuário pode ver uma demanda específica
function canUserViewDemand(demandId) {
    // Se acesso completo, pode ver tudo
    if (currentUserAccessType === 'full' || currentUserAccessType === null) {
        return true;
    }
    
    // Se acesso apenas ao painel, pode ver todas as demandas do painel
    if (currentUserAccessType === 'panel') {
        const demand = demands.find(d => d.id === demandId);
        return demand && demand.panelId === currentUserRestrictedPanelId;
    }
    
    // Se acesso apenas ao card, só pode ver o card específico
    if (currentUserAccessType === 'card') {
        return demandId === currentUserRestrictedDemandId;
    }
    
    return false;
}

function renderKanban() {
    // Se não houver painel selecionado, mostrar mensagem
    if (!currentPanelId) {
        const columns = ['pendente', 'andamento', 'revisao', 'concluido'];
        columns.forEach(status => {
            const column = document.getElementById(`column-${status}`);
            column.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📋</div>
                    <p>Selecione um painel para começar</p>
                </div>
            `;
        });
        return;
    }

    const columns = ['pendente', 'andamento', 'revisao', 'concluido'];
    
    columns.forEach(status => {
        const column = document.getElementById(`column-${status}`);
        column.innerHTML = '';
        
        // Filtrar demandas do painel atual (excluir arquivadas)
        let demandsInColumn = demands.filter(d => d.status === status && d.panelId === currentPanelId && !d.archived);
        
        // Aplicar restrições de acesso
        if (currentUserAccessType === 'card') {
            // Se acesso apenas ao card, mostrar apenas o card específico
            demandsInColumn = demandsInColumn.filter(d => d.id === currentUserRestrictedDemandId);
        } else if (currentUserAccessType === 'panel') {
            // Se acesso ao painel, mostrar apenas demandas do painel restrito
            demandsInColumn = demandsInColumn.filter(d => d.panelId === currentUserRestrictedPanelId);
        }
        
        if (demandsInColumn.length === 0) {
            // Mensagem diferente se for acesso restrito
            if (currentUserAccessType === 'card') {
                column.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">🔒</div>
                        <p>Acesso restrito a este card</p>
                    </div>
                `;
            } else {
                column.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">📋</div>
                        <p>Nenhuma demanda aqui</p>
                    </div>
                `;
            }
        } else {
            demandsInColumn.forEach(demand => {
                const card = createCard(demand);
                column.appendChild(card);
            });
        }
    });

    setupDragAndDrop();
}

// Criar Card
function createCard(demand) {
    const card = document.createElement('div');
    card.className = 'kanban-card';
    card.draggable = true;
    card.dataset.id = demand.id;

    const priorityClass = `priority-${demand.priority}`;
    const priorityLabel = {
        'baixa': 'B',
        'media': 'M',
        'alta': 'A',
        'urgente': 'U'
    }[demand.priority];
    const priorityLabelFull = {
        'baixa': 'Baixa',
        'media': 'Média',
        'alta': 'Alta',
        'urgente': 'Urgente'
    }[demand.priority];
    const priorityStrategy = demand.priorityStrategy || 'manual';
    const gutScore = demand.gut?.score ?? null;
    
    // Se usar GUT, badge será posicionado no topo do card
    let priorityStackHtml = '';
    let gutBadgeAbsolute = '';
    if (priorityStrategy === 'gut') {
        gutBadgeAbsolute = `
            <span class="card-gut-badge-top-item ${priorityClass}" title="Prioridade calculada via Matriz GUT (Score ${gutScore ?? 'N/D'})">
                <span class="gut-badge-label">GUT</span>
                <span class="gut-badge-content">
                    <span class="gut-score">${gutScore ?? '--'}</span>
                    <span class="gut-priority-label">${priorityLabelFull}</span>
                </span>
            </span>
        `;
        // Não mostrar badge de prioridade normal quando usar GUT
        priorityStackHtml = '';
    } else {
        // Se não usar GUT, mostrar apenas o badge de prioridade normal
        priorityStackHtml = `
            <div class="card-priority-stack">
                <span class="card-bar-priority ${priorityClass}">${priorityLabel}</span>
            </div>
        `;
    }

    const date = new Date(demand.createdAt);
    const formattedDate = date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });

    // Formatar prazo de entrega (sempre clicável para editar)
    let deadlineHtml = '';
    if (demand.deadline) {
        const deadlineDate = new Date(demand.deadline);
        const now = new Date();
        const isOverdue = deadlineDate < now && demand.status !== 'concluido';
        const formattedDeadline = deadlineDate.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        const deadlineClass = isOverdue ? 'deadline-overdue' : 'deadline-ok';
        const deadlineIcon = isOverdue ? '⚠️' : '📅';
        
        deadlineHtml = `
            <div class="card-deadline ${deadlineClass}" onclick="event.stopPropagation(); openDeadlineModal(${demand.id})" style="cursor: pointer;" title="Clique para editar o prazo">
                <span class="deadline-icon">${deadlineIcon}</span>
                <span class="deadline-text">Prazo: ${formattedDeadline}</span>
            </div>
        `;
    } else {
        // Mostrar opção para definir prazo mesmo quando não existe
        deadlineHtml = `
            <div class="card-deadline deadline-none" onclick="event.stopPropagation(); openDeadlineModal(${demand.id})" style="cursor: pointer;" title="Clique para definir o prazo">
                <span class="deadline-icon">📅</span>
                <span class="deadline-text">Definir Prazo</span>
            </div>
        `;
    }

    // Colaboradores do card
    let collaboratorsHtml = '';
    if (demand.collaborators && demand.collaborators.length > 0) {
        const collaboratorsList = demand.collaborators.slice(0, 3).map(c => {
            const initials = c.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
            return `<span class="collaborator-avatar" title="${escapeHtml(c.name)}">${initials}</span>`;
        }).join('');
        const moreCount = demand.collaborators.length > 3 ? `<span class="collaborator-more">+${demand.collaborators.length - 3}</span>` : '';
        collaboratorsHtml = `
            <div class="card-collaborators">
                <span class="collaborators-label">👥</span>
                ${collaboratorsList}${moreCount}
            </div>
        `;
    }

    // Barra de progresso das tarefas
    let progressHtml = '';
    let completedTasks = 0;
    let totalTasks = 0;
    let progress = 0;
    
    if (demand.tasks && demand.tasks.length > 0) {
        completedTasks = demand.tasks.filter(t => t.completed).length;
        totalTasks = demand.tasks.length;
        progress = Math.round((completedTasks / totalTasks) * 100);
        
        progressHtml = `
            <div class="card-progress">
                <div class="card-progress-info">
                    <span>📋 ${completedTasks}/${totalTasks} tarefas</span>
                    <span class="progress-percent">${progress}%</span>
                </div>
                <div class="card-progress-bar">
                    <div class="card-progress-fill" style="width: ${progress}%"></div>
                </div>
            </div>
        `;
    }

    // Banner de resumo para hover (tooltip) - mostra descrição, prazo e progresso
    let summaryBannerHtml = '';
    if (demand.description || demand.deadline || (demand.tasks && demand.tasks.length > 0)) {
        // Formatar prazo para o banner
        let deadlineBannerHtml = '';
        if (demand.deadline) {
            const deadlineDate = new Date(demand.deadline);
            const now = new Date();
            const isOverdue = deadlineDate < now && demand.status !== 'concluido';
            const formattedDeadline = deadlineDate.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            const deadlineIcon = isOverdue ? '⚠️' : '📅';
            const deadlineClass = isOverdue ? 'deadline-overdue' : 'deadline-ok';
            
            deadlineBannerHtml = `
                <div class="summary-banner-section">
                    <div class="summary-banner-label">${deadlineIcon} Prazo de Entrega</div>
                    <div class="summary-banner-deadline ${deadlineClass}">
                        ${formattedDeadline}
                        ${isOverdue ? '<span class="deadline-warning"> (Atrasado)</span>' : ''}
                    </div>
                </div>
            `;
        }
        
        summaryBannerHtml = `
        <div class="card-summary-banner" onclick="event.stopPropagation()">
            <div class="summary-banner-background"></div>
            <div class="summary-banner-content">
                ${demand.description ? `
                    <div class="summary-banner-section">
                        <div class="summary-banner-label">📝 Descrição</div>
                        <div class="summary-banner-description">${convertUrlsToLinks(demand.description)}</div>
                    </div>
                ` : ''}
                ${deadlineBannerHtml}
                ${demand.tasks && demand.tasks.length > 0 ? `
                    <div class="summary-banner-section">
                        <div class="summary-banner-label">📋 Progresso das Tarefas</div>
                        <div class="summary-banner-info">
                            <span>${completedTasks}/${totalTasks} tarefas concluídas</span>
                            <span class="summary-banner-percent">${progress}%</span>
                        </div>
                        <div class="summary-banner-bar">
                            <div class="summary-banner-fill" style="width: ${progress}%"></div>
                        </div>
                    </div>
                ` : ''}
            </div>
        </div>
        `;
    }

    // Verificar status do prazo para ícones na barra
    let deadlineIconHtml = '';
    if (demand.deadline) {
        const deadlineDate = new Date(demand.deadline);
        const now = new Date();
        const daysUntilDeadline = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));
        
        if (deadlineDate < now && demand.status !== 'concluido') {
            // Prazo vencido
            deadlineIconHtml = '<span class="card-bar-deadline-icon deadline-overdue-icon" title="Prazo vencido">⚠️</span>';
        } else if (daysUntilDeadline <= 2 && daysUntilDeadline >= 0 && demand.status !== 'concluido') {
            // Faltam 2 dias ou menos
            deadlineIconHtml = '<span class="card-bar-deadline-icon deadline-warning-icon" title="Prazo próximo">⏳</span>';
        }
    }
    
    card.innerHTML = `
        <div class="card-bar" onclick="toggleCardExpand(${demand.id})">
            ${priorityStrategy === 'gut' ? `
                <div class="card-gut-badge-top">
                    ${gutBadgeAbsolute}
                </div>
            ` : ''}
            <div class="card-bar-content">
                ${priorityStackHtml}
                <div class="card-bar-main">
                <div class="card-bar-title">${escapeHtml(demand.title)}</div>
                ${deadlineIconHtml}
                </div>
            </div>
            ${summaryBannerHtml}
        </div>
        <div class="card-content">
            <div class="card-actions">
                <button class="card-action-btn" onclick="editDemand(${demand.id})" title="Editar">
                    ✏️
                </button>
                <button class="card-action-btn" onclick="generateCardReportPDF(${demand.id})" title="Gerar Relatório PDF">
                    📄
                </button>
                <button class="card-action-btn" onclick="manageCollaborators(${demand.id})" title="Gerenciar Colaboradores">
                    👥
                </button>
                <button class="card-action-btn" onclick="transferDemand(${demand.id})" title="Transferir para outro Painel">
                    🔄
                </button>
                <button class="card-action-btn" onclick="deleteDemand(${demand.id})" title="Arquivar">
                    📦
                </button>
            </div>
            ${demand.description ? `<div class="card-description">${convertUrlsToLinks(demand.description)}</div>` : ''}
            ${demand.w5h2 && demand.w5h2.enabled ? `
                <div class="card-w5h2">
                    <div class="w5h2-card-header" onclick="openW5H2ViewModal(${demand.id})">
                        <span class="w5h2-card-icon">📊</span>
                        <span class="w5h2-card-title">Análise 5W2H</span>
                        <span class="w5h2-card-toggle">👁️</span>
            </div>
                    <div class="w5h2-card-content" id="w5h2-content-${demand.id}" style="max-height: 0; opacity: 0; padding: 0 1rem;">
                        <div class="w5h2-card-grid">
                            ${demand.w5h2.what ? `
                                <div class="w5h2-card-item" data-field="what">
                                    <div class="w5h2-card-item-header">
                                        <span class="w5h2-card-item-icon">🎯</span>
                                        <span class="w5h2-card-item-label">O quê?</span>
                                    </div>
                                    <div class="w5h2-card-item-value">${escapeHtml(demand.w5h2.what)}</div>
                                </div>
                            ` : ''}
                            ${demand.w5h2.who ? `
                                <div class="w5h2-card-item" data-field="who">
                                    <div class="w5h2-card-item-header">
                                        <span class="w5h2-card-item-icon">👤</span>
                                        <span class="w5h2-card-item-label">Quem?</span>
                                    </div>
                                    <div class="w5h2-card-item-value">${escapeHtml(demand.w5h2.who)}</div>
                                </div>
                            ` : ''}
                            ${demand.w5h2.when ? `
                                <div class="w5h2-card-item" data-field="when">
                                    <div class="w5h2-card-item-header">
                                        <span class="w5h2-card-item-icon">📅</span>
                                        <span class="w5h2-card-item-label">Quando?</span>
                                    </div>
                                    <div class="w5h2-card-item-value">${escapeHtml(demand.w5h2.when)}</div>
                                </div>
                            ` : ''}
                            ${demand.w5h2.where ? `
                                <div class="w5h2-card-item" data-field="where">
                                    <div class="w5h2-card-item-header">
                                        <span class="w5h2-card-item-icon">📍</span>
                                        <span class="w5h2-card-item-label">Onde?</span>
                                    </div>
                                    <div class="w5h2-card-item-value">${escapeHtml(demand.w5h2.where)}</div>
                                </div>
                            ` : ''}
                            ${demand.w5h2.why ? `
                                <div class="w5h2-card-item" data-field="why">
                                    <div class="w5h2-card-item-header">
                                        <span class="w5h2-card-item-icon">❓</span>
                                        <span class="w5h2-card-item-label">Por quê?</span>
                                    </div>
                                    <div class="w5h2-card-item-value">${escapeHtml(demand.w5h2.why)}</div>
                                </div>
                            ` : ''}
                            ${demand.w5h2.how ? `
                                <div class="w5h2-card-item" data-field="how">
                                    <div class="w5h2-card-item-header">
                                        <span class="w5h2-card-item-icon">⚙️</span>
                                        <span class="w5h2-card-item-label">Como?</span>
                                    </div>
                                    <div class="w5h2-card-item-value">${escapeHtml(demand.w5h2.how)}</div>
                                </div>
                            ` : ''}
                            ${demand.w5h2.howMuch ? `
                                <div class="w5h2-card-item" data-field="howmuch">
                                    <div class="w5h2-card-item-header">
                                        <span class="w5h2-card-item-icon">💰</span>
                                        <span class="w5h2-card-item-label">Quanto custa?</span>
                                    </div>
                                    <div class="w5h2-card-item-value">${escapeHtml(demand.w5h2.howMuch)}</div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            ` : ''}
            ${demand.pdsa && demand.pdsa.enabled ? `
                <div class="card-pdsa">
                    <div class="pdsa-card-header" onclick="openPDSViewModal(${demand.id})">
                        <span class="pdsa-card-icon">🔄</span>
                        <span class="pdsa-card-title">Ciclo PDSA</span>
                        <span class="pdsa-card-toggle">👁️</span>
                    </div>
                    <div class="pdsa-card-content" id="pdsa-content-${demand.id}" style="max-height: 0; opacity: 0; padding: 0 1rem;">
                        <div class="pdsa-card-grid">
                            ${demand.pdsa.plan ? `
                                <div class="pdsa-card-item" data-field="plan">
                                    <div class="pdsa-card-item-header">
                                        <span class="pdsa-card-item-icon">📋</span>
                                        <span class="pdsa-card-item-label">Plan</span>
                                    </div>
                                    <div class="pdsa-card-item-value">${escapeHtml(demand.pdsa.plan)}</div>
                                </div>
                            ` : ''}
                            ${demand.pdsa.do ? `
                                <div class="pdsa-card-item" data-field="do">
                                    <div class="pdsa-card-item-header">
                                        <span class="pdsa-card-item-icon">⚡</span>
                                        <span class="pdsa-card-item-label">Do</span>
                                    </div>
                                    <div class="pdsa-card-item-value">${escapeHtml(demand.pdsa.do)}</div>
                                </div>
                            ` : ''}
                            ${demand.pdsa.study ? `
                                <div class="pdsa-card-item" data-field="study">
                                    <div class="pdsa-card-item-header">
                                        <span class="pdsa-card-item-icon">🔍</span>
                                        <span class="pdsa-card-item-label">Study</span>
                                    </div>
                                    <div class="pdsa-card-item-value">${escapeHtml(demand.pdsa.study)}</div>
                                </div>
                            ` : ''}
                            ${demand.pdsa.act ? `
                                <div class="pdsa-card-item" data-field="act">
                                    <div class="pdsa-card-item-header">
                                        <span class="pdsa-card-item-icon">✅</span>
                                        <span class="pdsa-card-item-label">Act</span>
                                    </div>
                                    <div class="pdsa-card-item-value">${escapeHtml(demand.pdsa.act)}</div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            ` : ''}
            ${deadlineHtml}
            ${progressHtml}
            ${collaboratorsHtml}
            <div class="card-footer">
                <button class="btn-tasks-chat" onclick="openTasksChat(${demand.id})" title="Tarefas e Chat">
                    📋 Tarefas & 💬 Chat
                </button>
                <div class="card-footer-info">
                    <div class="card-responsible">${escapeHtml(demand.responsible)}</div>
                    <div class="card-date">${formattedDate}</div>
                </div>
            </div>
        </div>
    `;

    // Card inicia colapsado por padrão
    card.classList.add('card-collapsed');

    // Adicionar event listener para abrir banner com botão direito do mouse
    const cardBar = card.querySelector('.card-bar');
    const summaryBanner = card.querySelector('.card-summary-banner');
    const bannerContainer = document.getElementById('summary-banner-container');
    
    if (cardBar && summaryBanner && bannerContainer) {
        // Prevenir menu de contexto padrão e mostrar banner
        cardBar.addEventListener('contextmenu', (e) => {
            e.preventDefault(); // Previne o menu de contexto padrão
            
            if (card.classList.contains('card-collapsed') && summaryBanner) {
                // Verificar se já existe um banner no container
                const existingBanner = bannerContainer.querySelector('.card-summary-banner');
                
                if (existingBanner) {
                    // Se já existe, remover
                    bannerContainer.innerHTML = '';
                } else {
                    // Se não existe, criar e mostrar
                    bannerContainer.innerHTML = '';
                    const bannerClone = summaryBanner.cloneNode(true);
                    bannerClone.style.display = 'block';
                    bannerClone.style.visibility = 'visible';
                    bannerClone.style.opacity = '1';
                    bannerClone.style.pointerEvents = 'auto';
                    bannerContainer.appendChild(bannerClone);
                }
            }
        });

        // Fechar banner ao clicar fora ou com botão esquerdo
        document.addEventListener('click', (e) => {
            if (!cardBar.contains(e.target) && !bannerContainer.contains(e.target)) {
                bannerContainer.innerHTML = '';
            }
        });

        // Fechar banner com ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                bannerContainer.innerHTML = '';
            }
        });
    }

    return card;
}

// Função para expandir/contrair card
window.toggleCardExpand = function(demandId) {
    const card = document.querySelector(`.kanban-card[data-id="${demandId}"]`);
    if (!card) return;
    
    if (card.classList.contains('card-collapsed')) {
        card.classList.remove('card-collapsed');
    } else {
        card.classList.add('card-collapsed');
    }
};

// Drag and Drop
function setupDragAndDrop() {
    const cards = document.querySelectorAll('.kanban-card');
    const columns = document.querySelectorAll('.column-content');

    cards.forEach(card => {
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);
    });

    columns.forEach(column => {
        column.addEventListener('dragover', handleDragOver);
        column.addEventListener('drop', handleDrop);
        column.addEventListener('dragleave', handleDragLeave);
    });
}

let draggedElement = null;
let draggedElementOldStatus = null; // Armazenar status anterior

function handleDragStart(e) {
    draggedElement = this;
    // Capturar o status atual antes de arrastar
    draggedElementOldStatus = this.closest('.kanban-column')?.dataset.status || 'pendente';
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    document.querySelectorAll('.column-content').forEach(col => {
        col.classList.remove('drag-over');
    });
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    this.classList.add('drag-over');
    return false;
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }

    this.classList.remove('drag-over');

    if (draggedElement !== null) {
        const demandId = parseInt(draggedElement.dataset.id);
        const newStatus = this.closest('.kanban-column').dataset.status;
        const oldStatus = draggedElementOldStatus; // Usar o status armazenado no início do drag
        
        // Atualizar status da demanda
        const demand = demands.find(d => d.id === demandId);
        if (demand) {
            // Garantir que o histórico existe
            if (!demand.history) {
                demand.history = [];
            }
            
            // Se está mudando para "em andamento" e não tinha prazo definido, abrir modal
            if (newStatus === 'andamento' && oldStatus !== 'andamento' && !demand.deadline) {
                pendingDemandId = demandId;
                // Atualizar status e renderizar para que o card apareça na coluna correta
                demand.status = newStatus;
                
                // Adicionar ao histórico
                if (oldStatus !== newStatus) {
                    demand.history.push({
                        action: 'status_changed',
                        timestamp: new Date().toISOString(),
                        user: localStorage.getItem('qualishel_current_user') || 'Sistema',
                        changes: [{ field: 'status', from: oldStatus, to: newStatus }]
                    });
                }
                
                saveDemands();
                renderKanban();
                updateCardCounts();
                // Notificar colaboradores sobre mudança de status
                if (oldStatus !== newStatus) {
                    notifyCollaboratorsAboutUpdate(demand, 'status_changed', { newStatus: newStatus });
                }
                // Abrir modal após um pequeno delay para visualização
                setTimeout(() => {
                    openDeadlineModal();
                }, 100);
            } else {
                // Se não precisa de prazo, atualizar normalmente
                demand.status = newStatus;
                
                // Adicionar ao histórico apenas se houve mudança
                if (oldStatus !== newStatus) {
                    demand.history.push({
                        action: 'status_changed',
                        timestamp: new Date().toISOString(),
                        user: localStorage.getItem('qualishel_current_user') || 'Sistema',
                        changes: [{ field: 'status', from: oldStatus, to: newStatus }]
                    });
                }
                
                saveDemands();
                renderKanban();
                updateCardCounts();
                updateDashboard();
                // Notificar colaboradores sobre mudança de status
                if (oldStatus !== newStatus) {
                    notifyCollaboratorsAboutUpdate(demand, 'status_changed', { newStatus: newStatus });
                }
            }
        }
    }

    draggedElementOldStatus = null; // Limpar
    return false;
}

// Editar Demanda
function editDemand(id) {
    const demand = demands.find(d => d.id === id);
    if (!demand) return;

    // Garantir que o histórico existe
    if (!demand.history) {
        demand.history = [];
    }

    // Abrir o modal primeiro
    demandModal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Alterar título do modal e texto do botão para edição ANTES de preencher os campos
    document.querySelector('.modal-header h3').textContent = 'Editar Demanda';
    const submitBtn = document.getElementById('submit-demand-btn');
    if (submitBtn) {
        submitBtn.textContent = 'Salvar';
    }

    // Preencher os campos do formulário
    document.getElementById('demand-title').value = demand.title;
    document.getElementById('demand-description').value = demand.description;
    setPriorityStateFromDemand(demand);
    document.getElementById('demand-responsible').value = demand.responsible;
    document.getElementById('demand-status').value = demand.status;
    
    // Preencher dados 5W2H
    if (demand.w5h2 && demand.w5h2.enabled) {
        const enableCheckbox = document.getElementById('enable-5w2h');
        if (enableCheckbox) {
            enableCheckbox.checked = true;
            toggleW5H2Panel(true);
        }
        if (document.getElementById('w5h2-what')) document.getElementById('w5h2-what').value = demand.w5h2.what || '';
        if (document.getElementById('w5h2-who')) document.getElementById('w5h2-who').value = demand.w5h2.who || '';
        if (document.getElementById('w5h2-when')) document.getElementById('w5h2-when').value = demand.w5h2.when || '';
        if (document.getElementById('w5h2-where')) document.getElementById('w5h2-where').value = demand.w5h2.where || '';
        if (document.getElementById('w5h2-why')) document.getElementById('w5h2-why').value = demand.w5h2.why || '';
        if (document.getElementById('w5h2-how')) document.getElementById('w5h2-how').value = demand.w5h2.how || '';
        if (document.getElementById('w5h2-howmuch')) document.getElementById('w5h2-howmuch').value = demand.w5h2.howMuch || '';
    } else {
        const enableCheckbox = document.getElementById('enable-5w2h');
        if (enableCheckbox) {
            enableCheckbox.checked = false;
            toggleW5H2Panel(false);
        }
    }
    
    // Preencher dados PDSA
    if (demand.pdsa && demand.pdsa.enabled) {
        const enablePDSACheckbox = document.getElementById('enable-pdsa');
        if (enablePDSACheckbox) {
            enablePDSACheckbox.checked = true;
            togglePDSAPanel(true);
        }
        if (document.getElementById('pdsa-plan')) document.getElementById('pdsa-plan').value = demand.pdsa.plan || '';
        if (document.getElementById('pdsa-do')) document.getElementById('pdsa-do').value = demand.pdsa.do || '';
        if (document.getElementById('pdsa-study')) document.getElementById('pdsa-study').value = demand.pdsa.study || '';
        if (document.getElementById('pdsa-act')) document.getElementById('pdsa-act').value = demand.pdsa.act || '';
    } else {
        const enablePDSACheckbox = document.getElementById('enable-pdsa');
        if (enablePDSACheckbox) {
            enablePDSACheckbox.checked = false;
            togglePDSAPanel(false);
        }
    }

    // Armazenar ID da demanda sendo editada para garantir que não crie nova
    let editingDemandId = id;

    // Alterar o comportamento do formulário para editar
    demandForm.onsubmit = (e) => {
        e.preventDefault();
        
        // Garantir que estamos editando a demanda correta
        const demandToEdit = demands.find(d => d.id === editingDemandId);
        if (!demandToEdit) {
            console.error('Demanda não encontrada para edição');
            return;
        }
        
        const oldStatus = demandToEdit.status;
        const oldPriority = demandToEdit.priority;
        const oldPriorityStrategy = demandToEdit.priorityStrategy || 'manual';
        const oldGutScore = demandToEdit.gut ? demandToEdit.gut.score : null;
        const oldTitle = demandToEdit.title;
        const oldResponsible = demandToEdit.responsible;
        
        // Coletar dados 5W2H
        const w5h2Data = {
            enabled: document.getElementById('enable-5w2h')?.checked || false,
            what: document.getElementById('w5h2-what')?.value || '',
            who: document.getElementById('w5h2-who')?.value || '',
            when: document.getElementById('w5h2-when')?.value || '',
            where: document.getElementById('w5h2-where')?.value || '',
            why: document.getElementById('w5h2-why')?.value || '',
            how: document.getElementById('w5h2-how')?.value || '',
            howMuch: document.getElementById('w5h2-howmuch')?.value || ''
        };
        
        // Atualizar apenas o objeto existente (não criar novo)
        demandToEdit.title = document.getElementById('demand-title').value;
        demandToEdit.description = document.getElementById('demand-description').value;
        demandToEdit.w5h2 = w5h2Data.enabled ? w5h2Data : null;
        demandToEdit.responsible = document.getElementById('demand-responsible').value;
        demandToEdit.status = document.getElementById('demand-status').value;
        const updatedPriorityData = extractPriorityData();
        demandToEdit.priority = updatedPriorityData.priority;
        demandToEdit.priorityStrategy = updatedPriorityData.priorityStrategy;
        demandToEdit.gut = updatedPriorityData.gut;
        
        // Adicionar ao histórico de mudanças
        const changes = [];
        if (oldTitle !== demandToEdit.title) {
            changes.push({ field: 'title', from: oldTitle, to: demandToEdit.title });
        }
        if (oldStatus !== demandToEdit.status) {
            changes.push({ field: 'status', from: oldStatus, to: demandToEdit.status });
        }
        const priorityChanged = oldPriority !== demandToEdit.priority;
        const strategyChanged = oldPriorityStrategy !== demandToEdit.priorityStrategy;
        const newGutScore = demandToEdit.gut ? demandToEdit.gut.score : null;
        const gutScoreChanged = oldGutScore !== newGutScore;

        if (priorityChanged) {
            changes.push({ field: 'priority', from: oldPriority, to: demandToEdit.priority });
        }
        if (strategyChanged) {
            changes.push({ field: 'priorityStrategy', from: oldPriorityStrategy, to: demandToEdit.priorityStrategy });
        }
        if (gutScoreChanged) {
            changes.push({ field: 'gutScore', from: oldGutScore, to: newGutScore });
        }
        if (oldResponsible !== demandToEdit.responsible) {
            changes.push({ field: 'responsible', from: oldResponsible, to: demandToEdit.responsible });
        }
        
        if (changes.length > 0) {
            demandToEdit.history.push({
                action: 'updated',
                timestamp: new Date().toISOString(),
                user: localStorage.getItem('qualishel_current_user') || 'Sistema',
                changes: changes
            });
        }

        saveDemands();
        renderKanban();
        updateCardCounts();
        updateDashboard(); // Atualizar dashboard se estiver visível
        
        // Notificar colaboradores sobre mudanças
        if (oldStatus !== demandToEdit.status) {
            notifyCollaboratorsAboutUpdate(demandToEdit, 'status_changed', { newStatus: demandToEdit.status });
        }
        if (priorityChanged || strategyChanged || gutScoreChanged) {
            notifyCollaboratorsAboutUpdate(demandToEdit, 'priority_changed', { 
                newPriority: demandToEdit.priority,
                priorityStrategy: demandToEdit.priorityStrategy,
                gutScore: demandToEdit.gut ? demandToEdit.gut.score : null
            });
        }
        
        closeModal();
        
        // Restaurar comportamento padrão
        demandForm.onsubmit = handleFormSubmit;
        editingDemandId = null;
    };
}

// Arquivar Demanda (ao invés de excluir)
function deleteDemand(id) {
    if (confirm('Tem certeza que deseja arquivar esta demanda? Ela será movida para o arquivo e poderá ser restaurada depois.')) {
        const demand = demands.find(d => d.id === id);
        if (demand) {
            // Garantir que o histórico existe
            if (!demand.history) {
                demand.history = [];
            }
            
            demand.archived = true;
            demand.archivedAt = new Date().toISOString();
            
            // Adicionar ao histórico
            demand.history.push({
                action: 'archived',
                timestamp: new Date().toISOString(),
                user: localStorage.getItem('qualishel_current_user') || 'Sistema'
            });
            
            saveDemands();
            renderKanban();
            updateCardCounts();
            updateDashboard(); // Atualizar dashboard se estiver visível
        }
    }
}

// Transferir Demanda para outro Painel
function transferDemand(id) {
    const demand = demands.find(d => d.id === id);
    if (!demand) return;
    
    currentDemandForTransfer = id;
    
    // Preencher o select com os painéis disponíveis (excluindo o painel atual)
    if (transferPanelSelect) {
        transferPanelSelect.innerHTML = '<option value="">Selecione um painel...</option>';
        
        const availablePanels = panels.filter(p => !p.archived && p.id !== demand.panelId);
        
        if (availablePanels.length === 0) {
            alert('Não há outros painéis disponíveis para transferir esta demanda.');
            return;
        }
        
        availablePanels.forEach(panel => {
            const option = document.createElement('option');
            option.value = panel.id;
            option.textContent = panel.name;
            transferPanelSelect.appendChild(option);
        });
    }
    
    // Abrir o modal
    if (transferDemandModal) {
        transferDemandModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeTransferDemandModal() {
    if (transferDemandModal) {
        transferDemandModal.classList.remove('active');
        document.body.style.overflow = '';
    }
    currentDemandForTransfer = null;
    if (transferPanelSelect) {
        transferPanelSelect.value = '';
    }
}

function confirmTransferDemand() {
    if (!currentDemandForTransfer || !transferPanelSelect) return;
    
    const targetPanelId = parseInt(transferPanelSelect.value);
    if (!targetPanelId) {
        alert('Por favor, selecione um painel de destino.');
        return;
    }
    
    const demand = demands.find(d => d.id === currentDemandForTransfer);
    if (!demand) return;
    
    const targetPanel = panels.find(p => p.id === targetPanelId);
    if (!targetPanel) {
        alert('Painel de destino não encontrado.');
        return;
    }
    
    // Confirmar transferência
    if (confirm(`Tem certeza que deseja transferir a demanda "${demand.title}" para o painel "${targetPanel.name}"?`)) {
        const oldPanelId = demand.panelId;
        const oldPanel = panels.find(p => p.id === oldPanelId);
        
        // Garantir que o histórico existe
        if (!demand.history) {
            demand.history = [];
        }
        
        // Atualizar o painel da demanda
        demand.panelId = targetPanelId;
        
        // Adicionar ao histórico
        demand.history.push({
            action: 'panel_transferred',
            timestamp: new Date().toISOString(),
            user: localStorage.getItem('qualishel_current_user') || 'Sistema',
            changes: [
                { field: 'panelId', from: oldPanelId, to: targetPanelId },
                { field: 'panelName', from: oldPanel ? oldPanel.name : 'Desconhecido', to: targetPanel.name }
            ]
        });
        
        // Salvar alterações
        saveDemands();
        
        // Fechar o modal
        closeTransferDemandModal();
        
        // Atualizar a interface
        renderKanban();
        updateCardCounts();
        updateDashboard();
        
        // Notificar colaboradores sobre a transferência
        notifyCollaboratorsAboutUpdate(demand, 'panel_transferred', {
            oldPanelName: oldPanel ? oldPanel.name : 'Desconhecido',
            newPanelName: targetPanel.name
        });
        
        // Se o painel atual não tiver mais demandas visíveis, mostrar mensagem
        const currentPanelDemands = demands.filter(d => d.panelId === currentPanelId && !d.archived);
        if (currentPanelDemands.length === 0) {
            console.log('ℹ️ Nenhuma demanda no painel atual após transferência');
        }
    }
}

// Atualizar Contadores
function updateCardCounts() {
    const statuses = ['pendente', 'andamento', 'revisao', 'concluido'];
    
    statuses.forEach(status => {
        const count = currentPanelId ? demands.filter(d => d.status === status && d.panelId === currentPanelId).length : 0;
        document.getElementById(`count-${status}`).textContent = count;
    });
}

// Funções de Gerenciamento de Painéis
function renderPanelSelector() {
    if (!panelSelector) return;
    
    const customSelect = document.getElementById('panel-selector-custom');
    const customTrigger = document.getElementById('panel-selector-trigger');
    const customValue = customTrigger?.querySelector('.custom-select-value');
    const customOptions = document.getElementById('panel-selector-options');
    
    // Se acesso restrito ao card, desabilitar seletor de painel
    if (currentUserAccessType === 'card') {
        panelSelector.innerHTML = '<option value="">Acesso restrito a um card específico</option>';
        panelSelector.disabled = true;
        panelSelector.style.opacity = '0.6';
        panelSelector.style.cursor = 'not-allowed';
        
        if (customValue) customValue.textContent = 'Acesso restrito a um card específico';
        if (customTrigger) customTrigger.style.opacity = '0.6';
        if (customTrigger) customTrigger.style.cursor = 'not-allowed';
        if (customOptions) customOptions.innerHTML = '';
    } else if (currentUserAccessType === 'panel') {
        // Se acesso ao painel, mostrar apenas o painel permitido
        panelSelector.innerHTML = '';
        const allowedPanel = panels.find(p => p.id === currentUserRestrictedPanelId);
        if (allowedPanel) {
            const option = document.createElement('option');
            option.value = allowedPanel.id;
            option.textContent = allowedPanel.name;
            option.selected = true;
            panelSelector.appendChild(option);
            
            if (customValue) customValue.textContent = allowedPanel.name;
            if (customOptions) {
                customOptions.innerHTML = `<div class="custom-select-option selected disabled">${allowedPanel.name}</div>`;
            }
        }
        panelSelector.disabled = true;
        panelSelector.style.opacity = '0.6';
        panelSelector.style.cursor = 'not-allowed';
        if (customTrigger) customTrigger.style.opacity = '0.6';
        if (customTrigger) customTrigger.style.cursor = 'not-allowed';
    } else {
        // Acesso completo - comportamento normal
        panelSelector.innerHTML = '<option value="">Selecione um painel...</option>';
        panelSelector.disabled = false;
        panelSelector.style.opacity = '1';
        panelSelector.style.cursor = 'pointer';
        if (customTrigger) customTrigger.style.opacity = '1';
        if (customTrigger) customTrigger.style.cursor = 'pointer';
        
        // Filtrar apenas painéis não arquivados
        const availablePanels = panels.filter(p => !p.archived);
        let selectedPanelName = 'Selecione um painel...';
        
        availablePanels.forEach(panel => {
            const option = document.createElement('option');
            option.value = panel.id;
            option.textContent = panel.name;
            if (panel.id === currentPanelId) {
                option.selected = true;
                selectedPanelName = panel.name;
            }
            panelSelector.appendChild(option);
        });
        
        // Atualizar dropdown customizado
        if (customValue) customValue.textContent = selectedPanelName;
        if (customOptions) {
            const customSelectContainer = document.getElementById('panel-selector-custom');
            
            // Limpar opções antigas
            customOptions.innerHTML = '';
            
            // Criar opções
            availablePanels.forEach(panel => {
                const optionDiv = document.createElement('div');
                optionDiv.className = 'custom-select-option';
                optionDiv.textContent = panel.name;
                optionDiv.dataset.value = panel.id;
                optionDiv.dataset.panelId = panel.id;
                optionDiv.dataset.panelName = panel.name;
                if (panel.id === currentPanelId) {
                    optionDiv.classList.add('selected');
                }
                customOptions.appendChild(optionDiv);
            });
            
            // Usar event delegation no container para garantir que sempre funcione
            // Remover listener antigo se existir
            if (customOptions._panelClickHandler) {
                customOptions.removeEventListener('click', customOptions._panelClickHandler, true);
            }
            
            // Criar novo handler usando event delegation
            customOptions._panelClickHandler = function(e) {
                // Encontrar a opção clicada
                const clickedOption = e.target.closest('.custom-select-option');
                if (!clickedOption) return;
                
                // Parar propagação
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                
                // Obter valores do dataset
                const panelIdValue = parseInt(clickedOption.dataset.panelId);
                const panelNameValue = clickedOption.dataset.panelName;
                
                if (!panelIdValue || !panelNameValue) return;
                
                // FECHAR DROPDOWN IMEDIATAMENTE - PRIMEIRA COISA
                const customSelectEl = document.getElementById('panel-selector-custom');
                if (customSelectEl) {
                    customSelectEl.classList.remove('open');
                    // Forçar remoção também via style para garantir
                    const dropdownEl = document.getElementById('panel-selector-dropdown');
                    if (dropdownEl) {
                        dropdownEl.style.opacity = '0';
                        dropdownEl.style.visibility = 'hidden';
                        dropdownEl.style.pointerEvents = 'none';
                        dropdownEl.style.transform = 'translateY(-10px)';
                    }
                }
                
                // Atualizar select nativo
                const currentPanelSelector = document.getElementById('panel-selector');
                if (currentPanelSelector) {
                    currentPanelSelector.value = panelIdValue;
                }
                
                // Atualizar o texto exibido no trigger
                const customValueEl = document.querySelector('#panel-selector-trigger .custom-select-value');
                if (customValueEl) {
                    customValueEl.textContent = panelNameValue;
                }
                
                // Disparar evento change para atualizar o painel
                setTimeout(() => {
                    const currentPanelSelector = document.getElementById('panel-selector');
                    if (currentPanelSelector) {
                        const changeEvent = new Event('change', { bubbles: true });
                        currentPanelSelector.dispatchEvent(changeEvent);
                    }
                }, 10);
                
                return false;
            };
            
            // Adicionar listener no container usando event delegation
            customOptions.addEventListener('click', customOptions._panelClickHandler, true);
        }
    }
    
    // Reinicializar o dropdown para garantir que os listeners estejam atualizados
    initCustomPanelDropdown();
    
    // Atualizar também os seletores do dashboard e relatório
    renderDashboardPanelSelector();
    renderReportPanelSelector();
    // Atualizar checkboxes se estiverem visíveis
    if (document.getElementById('panel-multiple-selector-container')?.style.display !== 'none') {
        renderPanelCheckboxes();
    }
}
// Variáveis globais para armazenar handlers (para poder remover se necessário)
let handleOutsideClickGlobal = null;
let customTriggerClickHandler = null;

// Inicializar dropdown customizado
function initCustomPanelDropdown() {
    const customSelect = document.getElementById('panel-selector-custom');
    const customTrigger = document.getElementById('panel-selector-trigger');
    const customDropdown = document.getElementById('panel-selector-dropdown');
    
    if (!customSelect || !customTrigger || !customDropdown) return;
    
    // Remover listeners antigos se existirem
    if (handleOutsideClickGlobal) {
        document.removeEventListener('click', handleOutsideClickGlobal, false);
        handleOutsideClickGlobal = null;
    }
    
    if (customTriggerClickHandler) {
        customTrigger.removeEventListener('click', customTriggerClickHandler, true);
        customTriggerClickHandler = null;
    }
    
    // Função para posicionar o dropdown
    function positionDropdown() {
        if (!customSelect.classList.contains('open')) return;
        
        const triggerRect = customTrigger.getBoundingClientRect();
        const dropdown = customDropdown;
        
        // Calcular posição
        let top = triggerRect.bottom + 8;
        let left = triggerRect.left;
        let width = triggerRect.width;
        
        // Temporariamente tornar visível para medir altura real
        dropdown.style.visibility = 'visible';
        dropdown.style.opacity = '0';
        dropdown.style.top = `${top}px`;
        dropdown.style.left = `${left}px`;
        dropdown.style.width = `${width}px`;
        
        const dropdownHeight = dropdown.scrollHeight;
        const maxHeight = Math.min(300, window.innerHeight - 200);
        
        // Verificar se há espaço abaixo
        const spaceBelow = window.innerHeight - triggerRect.bottom - 20;
        const spaceAbove = triggerRect.top - 20;
        
        // Se não houver espaço suficiente abaixo, abrir para cima
        if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
            top = triggerRect.top - Math.min(dropdownHeight, maxHeight) - 8;
            if (top < 20) {
                top = 20;
            }
        } else {
            // Garantir que não saia da tela
            if (top + dropdownHeight > window.innerHeight - 20) {
                top = window.innerHeight - Math.min(dropdownHeight, maxHeight) - 20;
            }
        }
        
        // Ajustar se sair da tela à direita
        if (left + width > window.innerWidth - 20) {
            left = window.innerWidth - width - 20;
        }
        
        // Ajustar se sair da tela à esquerda
        if (left < 20) {
            left = 20;
        }
        
        dropdown.style.top = `${top}px`;
        dropdown.style.left = `${left}px`;
        dropdown.style.width = `${width}px`;
        dropdown.style.maxHeight = `${maxHeight}px`;
        dropdown.style.opacity = '1';
    }
    
    // Toggle dropdown ao clicar no trigger (usar função nomeada para poder remover)
    customTriggerClickHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        // Se já estiver aberto, fechar
        if (customSelect.classList.contains('open')) {
            customSelect.classList.remove('open');
            const dropdown = document.getElementById('panel-selector-dropdown');
            if (dropdown) {
                dropdown.style.opacity = '0';
                dropdown.style.visibility = 'hidden';
                dropdown.style.pointerEvents = 'none';
                dropdown.style.transform = 'translateY(-10px)';
            }
        } else {
            // Se estiver fechado, abrir
            customSelect.classList.add('open');
            const dropdown = document.getElementById('panel-selector-dropdown');
            if (dropdown) {
                dropdown.style.opacity = '1';
                dropdown.style.visibility = 'visible';
                dropdown.style.pointerEvents = 'auto';
                dropdown.style.transform = 'translateY(0)';
            }
            setTimeout(positionDropdown, 10);
        }
    };
    
    customTrigger.addEventListener('click', customTriggerClickHandler, true);
    
    // Reposicionar ao redimensionar ou scroll
    window.addEventListener('resize', () => {
        if (customSelect.classList.contains('open')) {
            positionDropdown();
        }
    });
    
    window.addEventListener('scroll', () => {
        if (customSelect.classList.contains('open')) {
            positionDropdown();
        }
    }, true);
    
    // Fechar dropdown ao clicar fora (usar uma função nomeada para poder remover se necessário)
    handleOutsideClickGlobal = (e) => {
        // Verificar se o clique foi em uma opção ou no trigger
        const clickedOption = e.target.closest('.custom-select-option');
        const clickedTrigger = e.target.closest('.custom-select-trigger');
        const clickedDropdown = e.target.closest('.custom-select-dropdown');
        
        // Se foi no trigger, não fazer nada (o handler do trigger já cuida disso)
        if (clickedTrigger) {
            return;
        }
        
        // Se foi em uma opção ou dentro do dropdown, não fechar aqui
        if (clickedOption || clickedDropdown) {
            return;
        }
        
        // Se não foi em nenhum elemento do dropdown, fechar
        const currentCustomSelect = document.getElementById('panel-selector-custom');
        if (currentCustomSelect && !currentCustomSelect.contains(e.target)) {
            currentCustomSelect.classList.remove('open');
            const dropdown = document.getElementById('panel-selector-dropdown');
            if (dropdown) {
                dropdown.style.opacity = '0';
                dropdown.style.visibility = 'hidden';
                dropdown.style.pointerEvents = 'none';
                dropdown.style.transform = 'translateY(-10px)';
            }
        }
    };
    
    // Adicionar listener SEM capture para não interferir com o trigger
    document.addEventListener('click', handleOutsideClickGlobal, false);
    
    // Fechar dropdown ao pressionar ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && customSelect.classList.contains('open')) {
            customSelect.classList.remove('open');
        }
    });
}

function renderDashboardPanelSelector() {
    const dashboardSelector = document.getElementById('dashboard-panel-selector');
    if (!dashboardSelector) return;
    
    dashboardSelector.innerHTML = '<option value="">Todos os Painéis</option>';
    
    panels.forEach(panel => {
        const option = document.createElement('option');
        option.value = panel.id;
        option.textContent = panel.name;
        dashboardSelector.appendChild(option);
    });
}

function renderReportPanelSelector() {
    const reportSelector = document.getElementById('report-panel-selector');
    if (!reportSelector) return;
    
    reportSelector.innerHTML = '<option value="">Selecione um painel</option>';
    
    panels.forEach(panel => {
        const option = document.createElement('option');
        option.value = panel.id;
        option.textContent = panel.name;
        reportSelector.appendChild(option);
    });
    
    // Renderizar checkboxes para múltiplos painéis
    renderPanelCheckboxes();
}

function renderPanelCheckboxes() {
    const checkboxesContainer = document.getElementById('panel-checkboxes');
    if (!checkboxesContainer) return;
    
    checkboxesContainer.innerHTML = '';
    
    if (panels.length === 0) {
        checkboxesContainer.innerHTML = '<p class="no-panels-message">Nenhum painel disponível</p>';
        return;
    }
    
    panels.forEach(panel => {
        const demandCount = demands.filter(d => d.panelId === panel.id).length;
        const checkboxWrapper = document.createElement('div');
        checkboxWrapper.className = 'panel-checkbox-item';
        checkboxWrapper.innerHTML = `
            <label class="checkbox-label">
                <input type="checkbox" value="${panel.id}" class="panel-checkbox">
                <span class="checkbox-custom"></span>
                <span class="checkbox-text">
                    <strong>${escapeHtml(panel.name)}</strong>
                    <small>${demandCount} demanda(s)</small>
                </span>
            </label>
        `;
        checkboxesContainer.appendChild(checkboxWrapper);
    });
}

function handlePanelSelectionModeChange() {
    const mode = document.querySelector('input[name="panel-selection-mode"]:checked')?.value || 'all';
    const singleContainer = document.getElementById('panel-selector-container');
    const multipleContainer = document.getElementById('panel-multiple-selector-container');
    
    if (mode === 'all') {
        if (singleContainer) singleContainer.style.display = 'none';
        if (multipleContainer) multipleContainer.style.display = 'none';
    } else if (mode === 'single') {
        if (singleContainer) singleContainer.style.display = 'block';
        if (multipleContainer) multipleContainer.style.display = 'none';
    } else if (mode === 'multiple') {
        if (singleContainer) singleContainer.style.display = 'none';
        if (multipleContainer) multipleContainer.style.display = 'block';
        // Garantir que checkboxes estão renderizados
        renderPanelCheckboxes();
    }
}

function handlePanelChange(e) {
    const panelId = parseInt(e.target.value);
    if (panelId) {
        currentPanelId = panelId;
        savePanels();
        renderKanban();
        updateCardCounts();
        updateDashboard();
        
        // Atualizar valor exibido no dropdown customizado
        const customValue = document.querySelector('#panel-selector-trigger .custom-select-value');
        const selectedPanel = panels.find(p => p.id === panelId);
        if (customValue && selectedPanel) {
            customValue.textContent = selectedPanel.name;
        }
        
        // Atualizar classe selected nas opções
        const customOptions = document.querySelectorAll('#panel-selector-options .custom-select-option');
        customOptions.forEach(opt => {
            opt.classList.remove('selected');
            if (parseInt(opt.dataset.value) === panelId) {
                opt.classList.add('selected');
            }
        });
    } else {
        currentPanelId = null;
        savePanels();
        renderKanban();
        updateCardCounts();
        
        // Atualizar valor exibido no dropdown customizado
        const customValue = document.querySelector('#panel-selector-trigger .custom-select-value');
        if (customValue) {
            customValue.textContent = 'Selecione um painel...';
        }
        
        // Remover seleção das opções
        const customOptions = document.querySelectorAll('#panel-selector-options .custom-select-option');
        customOptions.forEach(opt => opt.classList.remove('selected'));
    }
}

function openPanelsModal() {
    if (!panelsModal) return;
    renderPanelsList();
    panelsModal.classList.add('active');
}

function closePanelsModal() {
    if (!panelsModal) return;
    panelsModal.classList.remove('active');
}

function openPanelFormModal(panelId = null) {
    if (!panelFormModal) return;
    currentPanelForEdit = panelId;
    const title = document.getElementById('panel-form-title');
    if (title) {
        title.textContent = panelId ? 'Editar Painel' : 'Novo Painel';
    }
    
    if (panelId) {
        const panel = panels.find(p => p.id === panelId);
        if (panel) {
            document.getElementById('panel-name').value = panel.name;
            document.getElementById('panel-description').value = panel.description || '';
        }
    } else {
        document.getElementById('panel-name').value = '';
        document.getElementById('panel-description').value = '';
    }
    
    panelFormModal.classList.add('active');
    closePanelsModal();
}

function closePanelFormModal() {
    if (!panelFormModal) return;
    panelFormModal.classList.remove('active');
    currentPanelForEdit = null;
    document.getElementById('panel-name').value = '';
    document.getElementById('panel-description').value = '';
}

function handlePanelFormSubmit(e) {
    e.preventDefault();
    
    const nameInput = document.getElementById('panel-name');
    const descriptionInput = document.getElementById('panel-description');
    
    if (!nameInput) {
        console.error('Campo panel-name não encontrado');
        return;
    }
    
    const name = nameInput.value.trim();
    if (!name) {
        alert('Por favor, informe o nome do painel.');
        return;
    }
    
    if (currentPanelForEdit) {
        // Editar painel existente
        const panel = panels.find(p => p.id === currentPanelForEdit);
        if (panel) {
            panel.name = name;
            panel.description = descriptionInput ? descriptionInput.value.trim() : '';
            panel.updatedAt = new Date().toISOString();
        }
    } else {
        // Criar novo painel
        const newPanel = {
            id: panelIdCounter++,
            name: name,
            description: descriptionInput ? descriptionInput.value.trim() : '',
            createdAt: new Date().toISOString()
        };
        panels.push(newPanel);
        currentPanelId = newPanel.id;
    }
    
    savePanels();
    renderPanelSelector();
    renderKanban();
    updateCardCounts();
    closePanelFormModal();
}

function renderPanelsList() {
    const panelsList = document.getElementById('panels-list');
    if (!panelsList) return;
    
    if (panels.length === 0) {
        panelsList.innerHTML = '<p class="empty-message">Nenhum painel criado ainda.</p>';
        return;
    }
    
    panelsList.innerHTML = panels.map(panel => {
        const demandCount = demands.filter(d => d.panelId === panel.id).length;
        return `
            <div class="panel-item">
                <div class="panel-item-info">
                    <h3>${escapeHtml(panel.name)}</h3>
                    ${panel.description ? `<p>${escapeHtml(panel.description)}</p>` : ''}
                    <span class="panel-meta">${demandCount} demanda(s)</span>
                </div>
                <div class="panel-item-actions">
                    <button class="btn-secondary" onclick="editPanel(${panel.id})" title="Editar">
                        ✏️
                    </button>
                    <button class="btn-secondary" onclick="deletePanel(${panel.id})" title="Arquivar">
                        📦
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

window.editPanel = function(panelId) {
    openPanelFormModal(panelId);
};

window.deletePanel = function(panelId) {
    if (!confirm('Tem certeza que deseja arquivar este painel? Todas as demandas associadas também serão arquivadas e poderão ser restauradas depois.')) {
        return;
    }
    
    // Arquivar painel
    const panel = panels.find(p => p.id === panelId);
    if (panel) {
        panel.archived = true;
        panel.archivedAt = new Date().toISOString();
    }
    
    // Arquivar demandas do painel
    demands.forEach(d => {
        if (d.panelId === panelId && !d.archived) {
            d.archived = true;
            d.archivedAt = new Date().toISOString();
        }
    });
    
    // Se o painel arquivado era o atual, selecionar outro ou limpar
    if (currentPanelId === panelId) {
        const activePanels = panels.filter(p => !p.archived);
        if (activePanels.length > 0) {
            currentPanelId = activePanels[0].id;
        } else {
            currentPanelId = null;
        }
    }
    
    savePanels();
    saveDemands();
    renderPanelSelector();
    renderKanban();
    updateCardCounts();
    renderPanelsList();
};

// Função auxiliar para comparar arrays de objetos de forma robusta
function arraysEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;
    
    // Normalizar arrays ordenando por ID para comparação
    const normalize = (arr) => {
        return arr.map(item => {
            const normalized = { ...item };
            // Remover campos temporários que podem causar diferenças
            delete normalized._temp;
            return normalized;
        }).sort((a, b) => (a.id || 0) - (b.id || 0));
    };
    
    const norm1 = normalize(arr1);
    const norm2 = normalize(arr2);
    
    return JSON.stringify(norm1) === JSON.stringify(norm2);
}

// Configurar sincronização em tempo real com Firebase
async function setupRealtimeSync() {
    if (typeof window.firebaseService === 'undefined' || !window.firebaseService.isInitialized()) {
        console.log('ℹ️ Firebase não inicializado. Sincronização em tempo real desabilitada.');
        return;
    }
    
    // VALIDAÇÃO: Verificar se há um usuário autenticado
    const currentUser = localStorage.getItem('qualishel_current_user');
    if (!currentUser) {
        console.warn('⚠️ Nenhum usuário autenticado. Sincronização em tempo real não será configurada.');
        return;
    }
    
    const userId = currentUser.toLowerCase().replace(/\s+/g, '_');
    console.log(`🔄 Configurando sincronização em tempo real para usuário: ${currentUser} (userId: ${userId})...`);
    
    // Listener para demandas (cards)
    try {
        await window.firebaseService.setupRealtimeDemandsListener((data) => {
            // VALIDAÇÃO CRÍTICA: Verificar se o usuário ainda é o mesmo
            const currentUser = localStorage.getItem('qualishel_current_user');
            if (!currentUser) {
                console.warn('⚠️ Nenhum usuário autenticado. Ignorando atualização de demandas.');
                return;
            }
            
            const expectedUserId = currentUser.toLowerCase().replace(/\s+/g, '_');
            const actualUserId = window.firebaseService.getCurrentUserId();
            
            if (actualUserId !== expectedUserId) {
                console.warn(`⚠️ Usuário mudou durante atualização! Esperado: ${expectedUserId}, Atual: ${actualUserId}. Ignorando...`);
                return;
            }
            
            // Evitar atualizar se estivermos salvando localmente (prevenir loop)
            if (isUpdatingFromRealtime) {
                console.log('ℹ️ Ignorando atualização de demandas - sincronização em andamento');
                return;
            }
            
            // Usar comparação robusta de arrays
            const hasChanged = !arraysEqual(demands, data.demands) || demandIdCounter !== data.counter;
            
            if (hasChanged) {
                console.log(`🔄 Atualizando demandas em tempo real para usuário: ${currentUser} (${actualUserId})...`, {
                    antes: demands.length,
                    depois: data.demands.length,
                    counterAntes: demandIdCounter,
                    counterDepois: data.counter,
                    timestamp: new Date().toISOString()
                });
                
                // Marcar flag ANTES de atualizar
                isUpdatingFromRealtime = true;
                
                // IMPORTANTE: Filtrar apenas demandas que pertencem ao usuário atual
                const newDemands = (data.demands || []).filter(d => {
                    // Se a demanda tem userId, verificar se corresponde
                    if (d.userId && d.userId !== expectedUserId) {
                        console.warn(`⚠️ Ignorando demanda ${d.id} - userId não corresponde (${d.userId} !== ${expectedUserId})`);
                        return false;
                    }
                    return true;
                });
                
                // Atualizar dados (substituir completamente, não mesclar)
                demands = newDemands;
                demandIdCounter = data.counter || 1;
                
                // Preservar chats e histórico ao atualizar
                demands.forEach(demand => {
                    if (!demand.chat) demand.chat = [];
                    if (!demand.deadlineHistory) demand.deadlineHistory = [];
                });
                
                // Atualizar interface
                renderKanban();
                updateCardCounts();
                updateDashboard();
                
                // Se houver um convite pendente, tentar processá-lo agora que os dados foram atualizados
                if (pendingInvite) {
                    console.log('🔄 Dados atualizados em tempo real, verificando convite pendente...');
                    console.log(`📋 Procurando demanda ID: ${pendingInvite.demandId}`);
                    console.log(`📊 Total de demandas agora: ${demands.length}`);
                    console.log(`📋 IDs disponíveis:`, demands.map(d => `${d.id} (${typeof d.id})`));
                    
                    const { demandId, panelId } = pendingInvite;
                    const numericDemandId = typeof demandId === 'string' ? parseInt(demandId) : demandId;
                    
                    const demand = demands.find(d => {
                        const demandIdNum = typeof d.id === 'string' ? parseInt(d.id) : d.id;
                        return demandIdNum === numericDemandId || d.id === numericDemandId;
                    });
                    
                    if (demand) {
                        console.log('✅ Demanda do convite encontrada após atualização em tempo real!');
                        console.log('📋 Demanda encontrada:', demand.title, 'ID:', demand.id);
                        const savedPendingInvite = { ...pendingInvite }; // Salvar antes de limpar
                        pendingInvite = null; // Limpar convite pendente
                        // Aguardar um pouco para garantir que o DOM foi atualizado
                        setTimeout(() => {
                            handleInviteAccess(savedPendingInvite.demandId, savedPendingInvite.panelId);
                        }, 500);
                    } else {
                        console.log(`⏳ Demanda ${numericDemandId} ainda não encontrada. Continuando a aguardar...`);
                    }
                }
                
                // NÃO salvar no localStorage aqui - isso é feito pelo firebase-service com userId correto
                // Remover qualquer chave antiga se existir (para evitar sincronização cruzada)
                if (localStorage.getItem('qualishel-demands')) {
                    console.log('🧹 Removendo chave antiga do localStorage: qualishel-demands');
                    localStorage.removeItem('qualishel-demands');
                }
                if (localStorage.getItem('qualishel-demand-counter')) {
                    console.log('🧹 Removendo chave antiga do localStorage: qualishel-demand-counter');
                    localStorage.removeItem('qualishel-demand-counter');
                }
                
                // Resetar flag DEPOIS de um pequeno delay para garantir que tudo foi processado
                setTimeout(() => {
                    isUpdatingFromRealtime = false;
                    console.log('✅ Flag de sincronização resetada para demandas');
                }, 200);
            } else {
                console.log('ℹ️ Dados de demandas não mudaram, ignorando atualização');
            }
        });
        console.log('✅ Listener de demandas configurado');
    } catch (error) {
        console.error('Erro ao configurar listener de demandas:', error);
    }
    
    // Listener para painéis
    try {
        await window.firebaseService.setupRealtimePanelsListener((data) => {
            // VALIDAÇÃO CRÍTICA: Verificar se o usuário ainda é o mesmo
            const currentUser = localStorage.getItem('qualishel_current_user');
            if (!currentUser) {
                console.warn('⚠️ Nenhum usuário autenticado. Ignorando atualização de painéis.');
                return;
            }
            
            const expectedUserId = currentUser.toLowerCase().replace(/\s+/g, '_');
            const actualUserId = window.firebaseService.getCurrentUserId();
            
            if (actualUserId !== expectedUserId) {
                console.warn(`⚠️ Usuário mudou durante atualização! Esperado: ${expectedUserId}, Atual: ${actualUserId}. Ignorando...`);
                return;
            }
            
            // Evitar atualizar se estivermos salvando localmente (prevenir loop)
            if (isUpdatingFromRealtime) {
                console.log('ℹ️ Ignorando atualização de painéis - sincronização em andamento');
                return;
            }
            
            // Usar comparação robusta de arrays
            const hasChanged = !arraysEqual(panels, data.panels) || 
                              panelIdCounter !== data.counter ||
                              currentPanelId !== data.currentPanelId;
            
            if (hasChanged) {
                console.log(`🔄 Atualizando painéis em tempo real para usuário: ${currentUser} (${actualUserId})...`, {
                    antes: panels.length,
                    depois: data.panels.length,
                    counterAntes: panelIdCounter,
                    counterDepois: data.counter,
                    currentPanelAntes: currentPanelId,
                    currentPanelDepois: data.currentPanelId
                });
                
                isUpdatingFromRealtime = true;
                
                // IMPORTANTE: Filtrar apenas painéis que pertencem ao usuário atual
                const newPanels = (data.panels || []).filter(p => {
                    // Se o painel tem userId, verificar se corresponde
                    if (p.userId && p.userId !== expectedUserId) {
                        console.warn(`⚠️ Ignorando painel ${p.id} - userId não corresponde (${p.userId} !== ${expectedUserId})`);
                        return false;
                    }
                    return true;
                });
                
                // Atualizar dados (substituir completamente, não mesclar)
                panels = newPanels;
                panelIdCounter = data.counter || 1;
                
                // Atualizar painel atual se mudou
                if (data.currentPanelId !== undefined && data.currentPanelId !== currentPanelId) {
                    currentPanelId = data.currentPanelId;
                }
                
                // Atualizar interface
                renderPanelSelector();
                renderKanban();
                updateCardCounts();
                
                // NÃO salvar no localStorage aqui - isso é feito pelo firebase-service com userId correto
                // Remover qualquer chave antiga se existir (para evitar sincronização cruzada)
                if (localStorage.getItem('qualishel-panels')) {
                    console.log('🧹 Removendo chave antiga do localStorage: qualishel-panels');
                    localStorage.removeItem('qualishel-panels');
                }
                if (localStorage.getItem('qualishel-panel-counter')) {
                    console.log('🧹 Removendo chave antiga do localStorage: qualishel-panel-counter');
                    localStorage.removeItem('qualishel-panel-counter');
                }
                if (localStorage.getItem('qualishel-current-panel')) {
                    console.log('🧹 Removendo chave antiga do localStorage: qualishel-current-panel');
                    localStorage.removeItem('qualishel-current-panel');
                }
                
                // Resetar flag DEPOIS de um pequeno delay (igual ao de demandas)
                setTimeout(() => {
                    isUpdatingFromRealtime = false;
                    console.log('✅ Flag de sincronização resetada para painéis');
                }, 200);
            } else {
                console.log('ℹ️ Dados de painéis não mudaram, ignorando atualização');
            }
        });
        console.log('✅ Listener de painéis configurado');
    } catch (error) {
        console.error('Erro ao configurar listener de painéis:', error);
    }
    
    // Listener para pessoas
    try {
        await window.firebaseService.setupRealtimePeopleListener((people) => {
            const hasChanged = !arraysEqual(availablePeople, people);
            
            if (hasChanged) {
                console.log('🔄 Atualizando pessoas em tempo real...', {
                    antes: availablePeople.length,
                    depois: people.length
                });
                availablePeople = people || [];
            }
        });
        console.log('✅ Listener de pessoas configurado');
    } catch (error) {
        console.error('Erro ao configurar listener de pessoas:', error);
    }
    
    console.log('✅ Sincronização em tempo real configurada');
}

// Função para corrigir cards sem panelId válido
function fixCardsWithoutPanelId() {
    if (panels.length === 0) {
        return; // Não há painéis disponíveis ainda
    }
    
    let needsSave = false;
    const defaultPanelId = currentPanelId || panels[0].id;
    
    demands.forEach(demand => {
        if (!demand.panelId || !panels.find(p => p.id === demand.panelId)) {
            demand.panelId = defaultPanelId;
            needsSave = true;
            console.log(`✅ Card "${demand.title}" corrigido - atribuído ao painel ${demand.panelId}`);
        }
    });
    
    if (needsSave) {
        saveDemands();
    }
}

// Persistência de Painéis
function savePanels() {
    // Se estiver atualizando de sincronização em tempo real, não salvar no Firebase (evitar loop)
    if (isUpdatingFromRealtime) {
        console.log('ℹ️ Ignorando savePanels - atualização em tempo real em andamento');
        return;
    }
    
    // Salvar através do firebase-service (que já gerencia isolamento por usuário)
    if (typeof window.firebaseService !== 'undefined' && window.firebaseService.isInitialized()) {
        window.firebaseService.savePanelsToStorage(panels, panelIdCounter, currentPanelId).catch(err => {
            console.warn('Erro ao sincronizar painéis com Firebase:', err);
        });
    } else {
        // Fallback: usar firebase-service mesmo sem Firebase (ele gerencia localStorage com userId)
        if (typeof window.firebaseService !== 'undefined') {
            window.firebaseService.savePanelsToStorage(panels, panelIdCounter, currentPanelId);
        }
    }
}

async function loadPanels() {
    let savedData = { panels: [], counter: 1, currentPanelId: null };
    
    // Sempre usar firebase-service (que gerencia isolamento por usuário)
    if (typeof window.firebaseService !== 'undefined') {
        try {
            const currentUser = localStorage.getItem('qualishel_current_user');
            console.log(`📥 Carregando painéis para usuário: ${currentUser}`);
            savedData = await window.firebaseService.loadPanelsFromStorage();
            console.log(`✅ Painéis carregados: ${savedData.panels.length} painéis encontrados`);
            if (savedData.panels.length > 0) {
                console.log(`📋 IDs dos painéis:`, savedData.panels.map(p => `${p.id}: ${p.name}`));
            }
        } catch (error) {
            console.warn('Erro ao carregar painéis:', error);
            // Retornar dados vazios se houver erro
            savedData = { panels: [], counter: 1, currentPanelId: null };
        }
    }
    
    // SEMPRE substituir os dados (não adicionar)
    panels = savedData.panels || [];
    panelIdCounter = savedData.counter || 1;
    if (savedData.currentPanelId) {
        currentPanelId = savedData.currentPanelId;
    } else {
        currentPanelId = null;
    }
    
    // Se não houver painéis, criar um padrão
    if (panels.length === 0) {
        const defaultPanel = {
            id: panelIdCounter++,
            name: 'Painel Principal',
            description: 'Painel padrão do sistema',
            createdAt: new Date().toISOString()
        };
        panels.push(defaultPanel);
        currentPanelId = defaultPanel.id;
        savePanels();
    }
}
// Persistência (Firebase ou LocalStorage)
function saveDemands() {
    // Se estiver atualizando de sincronização em tempo real, não salvar no Firebase (evitar loop)
    if (isUpdatingFromRealtime) {
        console.log('ℹ️ Ignorando saveDemands - atualização em tempo real em andamento');
        return;
    }
    
    // Garantir que o chat nunca seja perdido - preservar todos os chats existentes
    demands.forEach(demand => {
        // Se a demanda não tem chat, inicializar como array vazio
        if (!demand.chat) {
            demand.chat = [];
        }
        // Garantir que chat seja sempre um array (nunca null ou undefined)
        if (!Array.isArray(demand.chat)) {
            demand.chat = [];
        }
        // Preservar todas as mensagens do chat - nunca apagar
        // O chat só pode crescer, nunca diminuir
        // Validar estrutura das mensagens para garantir integridade
        if (demand.chat && Array.isArray(demand.chat)) {
            demand.chat = demand.chat.filter(msg => msg && msg.text && msg.author && msg.timestamp);
        }
        
        // Garantir que o histórico de prazo nunca seja perdido
        if (!demand.deadlineHistory) {
            demand.deadlineHistory = [];
        }
        // Garantir que deadlineHistory seja sempre um array
        if (!Array.isArray(demand.deadlineHistory)) {
            demand.deadlineHistory = [];
        }
        // Validar estrutura das entradas do histórico
        if (demand.deadlineHistory && Array.isArray(demand.deadlineHistory)) {
            demand.deadlineHistory = demand.deadlineHistory.filter(entry => 
                entry && entry.timestamp && entry.reason && entry.author
            );
        }
    });
    
    // Salvar através do firebase-service (que já gerencia isolamento por usuário)
    if (typeof window.firebaseService !== 'undefined' && window.firebaseService.isInitialized()) {
        window.firebaseService.saveDemandsToStorage(demands, demandIdCounter).catch(err => {
            console.warn('Erro ao sincronizar com Firebase:', err);
        });
    } else {
        // Fallback: usar firebase-service mesmo sem Firebase (ele gerencia localStorage com userId)
        if (typeof window.firebaseService !== 'undefined') {
            window.firebaseService.saveDemandsToStorage(demands, demandIdCounter);
        }
    }
}

async function loadDemands() {
    let savedData = { demands: [], counter: 1 };
    let savedPeople = [];
    
    // Sempre usar firebase-service (que gerencia isolamento por usuário)
    if (typeof window.firebaseService !== 'undefined') {
        try {
            const currentUser = localStorage.getItem('qualishel_current_user');
            console.log(`📥 Carregando demandas para usuário: ${currentUser}`);
            savedData = await window.firebaseService.loadDemandsFromStorage();
            savedPeople = await window.firebaseService.loadPeopleFromStorage();
            console.log(`✅ Demandas carregadas: ${savedData.demands.length} demandas encontradas`);
            if (savedData.demands.length > 0) {
                console.log(`📋 IDs das demandas:`, savedData.demands.map(d => `${d.id}: ${d.title}`));
            }
        } catch (error) {
            console.warn('Erro ao carregar dados:', error);
            // Retornar dados vazios se houver erro
            savedData = { demands: [], counter: 1 };
            savedPeople = [];
        }
    }
    
    // SEMPRE substituir os dados (não adicionar)
    demands = savedData.demands || [];
    demandIdCounter = savedData.counter || 1;
    
    // Log para debug de convites
    console.log(`📦 Demandas carregadas: ${demands.length}`);
    if (demands.length > 0) {
        console.log(`📋 IDs das demandas:`, demands.map(d => d.id));
    }
    
    // Garantir que todos os chats sejam preservados e nunca apagados
    // E garantir que todos os cards tenham um panelId válido
    demands.forEach(demand => {
        // Se a demanda não tem chat, inicializar como array vazio
        if (!demand.chat) {
            demand.chat = [];
        }
        // Garantir que chat seja sempre um array (nunca null ou undefined)
        if (!Array.isArray(demand.chat)) {
            demand.chat = [];
        }
        // Preservar todas as mensagens - garantir que nenhuma seja perdida
        // Validar estrutura das mensagens do chat
        if (demand.chat && Array.isArray(demand.chat)) {
            demand.chat = demand.chat.filter(msg => msg && msg.text && msg.author && msg.timestamp);
        }
        
        // Garantir que o histórico de prazo seja preservado
        if (!demand.deadlineHistory) {
            demand.deadlineHistory = [];
        }
        if (!Array.isArray(demand.deadlineHistory)) {
            demand.deadlineHistory = [];
        }
        // Validar estrutura das entradas do histórico
        if (demand.deadlineHistory && Array.isArray(demand.deadlineHistory)) {
            demand.deadlineHistory = demand.deadlineHistory.filter(entry => 
                entry && entry.timestamp && entry.reason && entry.author
            );
        }

        // Garantir que w5h2 seja inicializado
        if (!demand.w5h2) {
            demand.w5h2 = null;
        }
        
        if (!demand.priorityStrategy) {
            demand.priorityStrategy = 'manual';
        }
        if (demand.priorityStrategy === 'gut') {
            if (!demand.gut) {
                demand.priorityStrategy = 'manual';
            } else {
                demand.gut.gravidade = Number(demand.gut.gravidade) || 3;
                demand.gut.urgencia = Number(demand.gut.urgencia) || 3;
                demand.gut.tendencia = Number(demand.gut.tendencia) || 3;
                demand.gut.score = Number(demand.gut.score) || calculateGutScore(demand.gut);
                demand.gut.priority = demand.gut.priority || mapGutScoreToPriority(demand.gut.score);
                demand.priority = demand.gut.priority;
            }
        } else if (demand.gut) {
            // limpar resíduos GUT se a estratégia atual for manual
            demand.gut = null;
        }
        
        // Garantir que todos os cards tenham um panelId válido
        // Se não tiver panelId ou o painel não existir, atribuir ao primeiro painel disponível
        if (!demand.panelId || !panels.find(p => p.id === demand.panelId)) {
            // Aguardar painéis serem carregados se ainda não foram
            if (panels.length > 0) {
                // Atribuir ao painel atual ou ao primeiro painel disponível
                demand.panelId = currentPanelId || panels[0].id;
                console.log(`⚠️ Card "${demand.title}" sem panelId válido. Atribuído ao painel ${demand.panelId}`);
            } else {
                // Se ainda não há painéis, será corrigido quando os painéis forem carregados
                console.warn(`⚠️ Card "${demand.title}" sem panelId e sem painéis disponíveis ainda.`);
            }
        }
    });
    
    // Salvar novamente para garantir persistência
    if (demands.length > 0) {
        saveDemands();
    }

    if (savedPeople.length > 0) {
        availablePeople = savedPeople;
    } else {
        // Inicializar com pessoas padrão
        availablePeople = [
            { name: 'Maria Silva', email: 'maria.silva@empresa.com' },
            { name: 'João Santos', email: 'joao.santos@empresa.com' },
            { name: 'Ana Costa', email: 'ana.costa@empresa.com' },
            { name: 'Pedro Oliveira', email: 'pedro.oliveira@empresa.com' },
            { name: 'Carla Mendes', email: 'carla.mendes@empresa.com' }
        ];
        saveAvailablePeople();
    }

    // Dados de exemplo se não houver dados salvos
    if (demands.length === 0) {
        demands = [
            {
                id: demandIdCounter++,
                title: 'Revisar procedimento de qualidade',
                description: 'Atualizar o procedimento SOP-001 conforme nova norma ISO 9001:2015',
                priority: 'alta',
                responsible: 'Maria Silva',
                status: 'pendente',
                createdAt: new Date().toISOString(),
                collaborators: []
            },
            {
                id: demandIdCounter++,
                title: 'Auditoria interna - Setor Produção',
                description: 'Realizar auditoria interna no setor de produção conforme cronograma anual',
                priority: 'media',
                responsible: 'João Santos',
                status: 'andamento',
                createdAt: new Date(Date.now() - 86400000).toISOString(),
                collaborators: []
            },
            {
                id: demandIdCounter++,
                title: 'Aprovar relatório de não conformidade',
                description: 'Revisar e aprovar relatório de NC-2024-015',
                priority: 'urgente',
                responsible: 'Ana Costa',
                status: 'revisao',
                createdAt: new Date(Date.now() - 172800000).toISOString(),
                collaborators: []
            }
        ];
        saveDemands();
    }
    
    // Garantir que todas as demandas tenham os campos necessários
    demands.forEach(demand => {
        if (!demand.collaborators) {
            demand.collaborators = [];
        }
        if (!demand.history) {
            demand.history = [];
            // Se não tem histórico mas já existe, criar entrada inicial
            if (demand.createdAt) {
                demand.history.push({
                    action: 'created',
                    timestamp: demand.createdAt,
                    user: 'Sistema',
                    details: {
                        title: demand.title,
                        status: demand.status,
                        priority: demand.priority
                    }
                });
            }
        }
        if (!demand.tasks) {
            demand.tasks = [];
        }
        if (!demand.chat) {
            demand.chat = [];
        }
    });
    
    updateAvailablePeopleList();
}

// Modal de Prazo
function openDeadlineModal(demandId = null) {
    // Se não foi passado um ID, usar o pendingDemandId (para compatibilidade com drag and drop)
    const targetDemandId = demandId || pendingDemandId;
    
    if (!targetDemandId) {
        console.warn('Nenhuma demanda especificada para definir prazo');
        return;
    }
    
    const demand = demands.find(d => d.id === targetDemandId);
    if (!demand) {
        console.warn('Demanda não encontrada');
        return;
    }
    
    // Atualizar título do modal
    const modalTitle = document.getElementById('deadline-modal-title');
    if (modalTitle) {
        modalTitle.textContent = demand.deadline ? 'Editar Prazo de Entrega' : 'Definir Prazo de Entrega';
    }
    
    // Preencher data de início (editável)
    const startDateInput = document.getElementById('deadline-start-date');
    if (startDateInput) {
        if (demand.createdAt) {
            const startDate = new Date(demand.createdAt);
            startDateInput.value = startDate.toISOString().split('T')[0];
        } else {
            // Se não tiver data de início, usar a data atual
            const today = new Date().toISOString().split('T')[0];
            startDateInput.value = today;
        }
    }
    
    // Definir data mínima como hoje
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('deadline-date');
    const timeInput = document.getElementById('deadline-time');
    const reasonInput = document.getElementById('deadline-reason');
    
    if (dateInput) {
        dateInput.min = today;
        
        // Se já tem prazo, preencher com o valor atual
        if (demand.deadline) {
            const currentDeadline = new Date(demand.deadline);
            dateInput.value = currentDeadline.toISOString().split('T')[0];
            timeInput.value = currentDeadline.toTimeString().slice(0, 5);
        } else {
            dateInput.value = '';
            timeInput.value = '';
        }
    }
    
    if (reasonInput) {
        reasonInput.value = '';
    }
    
    // Mostrar informações de contexto (prazo atual se existir)
    const contextInfo = document.getElementById('deadline-context-info');
    if (contextInfo) {
        const currentDeadline = demand.deadline ? new Date(demand.deadline).toLocaleDateString('pt-BR') : 'Não definido';
        if (demand.deadline) {
            contextInfo.innerHTML = `
                <div class="context-info-box">
                    <div class="context-info-item">
                        <strong>Prazo Atual:</strong> ${currentDeadline}
                    </div>
                </div>
            `;
        } else {
            contextInfo.innerHTML = '';
        }
    }
    
    // Mostrar histórico se houver
    const historySection = document.getElementById('deadline-history-section');
    const historyList = document.getElementById('deadline-history-list');
    
    if (historySection && historyList && demand.deadlineHistory && demand.deadlineHistory.length > 0) {
        historySection.style.display = 'block';
        // Obter data de início da demanda
        const demandStartDate = demand.createdAt ? new Date(demand.createdAt).toLocaleDateString('pt-BR') : 'Não definida';
        
        historyList.innerHTML = demand.deadlineHistory.map(entry => {
            const entryDate = new Date(entry.timestamp);
            const formattedDate = entryDate.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            const oldDate = entry.oldDeadline ? new Date(entry.oldDeadline).toLocaleDateString('pt-BR') : 'Não definido';
            const newDate = entry.newDeadline ? new Date(entry.newDeadline).toLocaleDateString('pt-BR') : 'Removido';
            
            return `
                <div class="deadline-history-item">
                    <div class="history-header">
                        <span class="history-date">${formattedDate}</span>
                        <span class="history-author">por ${escapeHtml(entry.author || 'Sistema')}</span>
                    </div>
                    <div class="history-change">
                        <strong>De:</strong> ${oldDate} → <strong>Para:</strong> ${newDate}
                    </div>
                    <div class="history-info">
                        <strong>Data de Início da Demanda:</strong> ${demandStartDate}
                    </div>
                    <div class="history-reason">
                        <strong>Justificativa:</strong> ${escapeHtml(entry.reason)}
                    </div>
                </div>
            `;
        }).join('');
    } else if (historySection) {
        historySection.style.display = 'none';
    }
    
    // Armazenar ID da demanda sendo editada
    pendingDemandId = targetDemandId;
    
    deadlineModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeDeadlineModal() {
    deadlineModal.classList.remove('active');
    document.body.style.overflow = '';
    
    // Se foi cancelado (pular), manter o status mas sem prazo
    // O card já está em "andamento" mas sem prazo definido
    if (pendingDemandId !== null) {
        // Não reverter, apenas salvar o estado atual
        saveDemands();
        renderKanban();
        updateCardCounts();
        updateDashboard();
        pendingDemandId = null;
    }
}

// ========== INTEGRAÇÃO COM GOOGLE CALENDAR ==========

// Função para criar URL do Google Calendar para adicionar evento
function createGoogleCalendarUrl(demand, deadline, startDate = null) {
    const deadlineDate = new Date(deadline);
    const start = startDate ? new Date(startDate) : deadlineDate;
    
    // Formatar datas no formato ISO 8601 (YYYYMMDDTHHmmssZ)
    const formatDate = (date) => {
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');
        const seconds = String(date.getUTCSeconds()).padStart(2, '0');
        return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
    };
    
    const startFormatted = formatDate(start);
    const endFormatted = formatDate(deadlineDate);
    
    // Criar título do evento
    const eventTitle = encodeURIComponent(`Prazo: ${demand.title}`);
    
    // Criar descrição do evento
    const description = encodeURIComponent(
        `Demanda: ${demand.title}\n` +
        `Status: ${demand.status}\n` +
        `Prioridade: ${demand.priority}\n` +
        `Responsável: ${demand.responsible}\n` +
        (demand.description ? `\nDescrição: ${demand.description}` : '')
    );
    
    // Criar localização (opcional)
    const location = encodeURIComponent('Qualishel - Escritório da Qualidade');
    
    // Construir URL do Google Calendar
    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE` +
        `&text=${eventTitle}` +
        `&dates=${startFormatted}/${endFormatted}` +
        `&details=${description}` +
        `&location=${location}` +
        `&sf=true` +
        `&output=xml`;
    
    return calendarUrl;
}

// Função para adicionar evento ao Google Calendar
function addToGoogleCalendar(demand, deadline, startDate = null) {
    const calendarUrl = createGoogleCalendarUrl(demand, deadline, startDate);
    
    // Abrir Google Calendar em nova aba
    window.open(calendarUrl, '_blank');
    
    console.log('📅 Link do Google Calendar gerado:', calendarUrl);
    return calendarUrl;
}

// ========== AUTENTICAÇÃO GOOGLE CALENDAR ==========

// Carregar token salvo
function loadGoogleCalendarToken() {
    const saved = localStorage.getItem('qualishel-google-calendar-token');
    if (saved) {
        try {
            googleCalendarToken = JSON.parse(saved);
            updateGoogleCalendarStatus();
            return true;
        } catch (e) {
            console.error('Erro ao carregar token do Google Calendar:', e);
        }
    }
    return false;
}

// Carregar Client ID salvo
function loadGoogleCalendarClientId() {
    const saved = localStorage.getItem('qualishel-google-calendar-client-id');
    if (saved) {
        googleCalendarClientId = saved;
        return true;
    }
    return false;
}

// Salvar Client ID
function saveGoogleCalendarClientId() {
    const clientIdInput = document.getElementById('google-calendar-client-id');
    const clientId = clientIdInput ? clientIdInput.value.trim() : '';
    
    if (!clientId) {
        alert('Por favor, informe o Client ID do Google.');
        return;
    }
    
    if (!clientId.includes('.apps.googleusercontent.com')) {
        if (!confirm('O Client ID parece estar incompleto. Deseja continuar mesmo assim?')) {
            return;
        }
    }
    
    googleCalendarClientId = clientId;
    localStorage.setItem('qualishel-google-calendar-client-id', clientId);
    showEmailNotification('Client ID salvo com sucesso!', 'success');
}

// Conectar com Google Calendar usando OAuth 2.0
async function connectGoogleCalendar() {
    try {
        // Verificar se Client ID está configurado
        if (!googleCalendarClientId) {
            alert('⚠️ Por favor, configure o Client ID do Google primeiro nas Configurações.');
            return;
        }
        
        // Verificar se Google API está disponível
        if (typeof google === 'undefined' || !google.accounts) {
            alert('⚠️ Google API não está disponível. Verifique sua conexão com a internet.');
            return;
        }

        // Configurar OAuth 2.0
        google.accounts.oauth2.initTokenClient({
            client_id: googleCalendarClientId,
            scope: 'https://www.googleapis.com/auth/calendar.events',
            callback: async (response) => {
                if (response.error) {
                    console.error('Erro na autenticação:', response.error);
                    alert('Erro ao conectar com Google Calendar: ' + response.error);
                    return;
                }

                // Salvar token
                googleCalendarToken = {
                    access_token: response.access_token,
                    expires_in: response.expires_in,
                    token_type: response.token_type,
                    scope: response.scope,
                    expires_at: Date.now() + (response.expires_in * 1000)
                };
                
                localStorage.setItem('qualishel-google-calendar-token', JSON.stringify(googleCalendarToken));
                
                // Obter informações do usuário
                await updateGoogleCalendarUserInfo();
                updateGoogleCalendarStatus();
                
                showEmailNotification('✅ Conectado ao Google Calendar com sucesso!', 'success');
            }
        }).requestAccessToken();
    } catch (error) {
        console.error('Erro ao conectar Google Calendar:', error);
        alert('Erro ao conectar com Google Calendar. Verifique o console para mais detalhes.');
    }
}

// Obter informações do usuário
async function updateGoogleCalendarUserInfo() {
    if (!googleCalendarToken || !googleCalendarToken.access_token) return;
    
    try {
        const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
                'Authorization': `Bearer ${googleCalendarToken.access_token}`
            }
        });
        
        if (response.ok) {
            const userInfo = await response.json();
            localStorage.setItem('qualishel-google-calendar-user-email', userInfo.email || '');
        }
    } catch (error) {
        console.error('Erro ao obter informações do usuário:', error);
    }
}

// Desconectar Google Calendar
function disconnectGoogleCalendar() {
    if (confirm('Tem certeza que deseja desconectar do Google Calendar?')) {
        googleCalendarToken = null;
        localStorage.removeItem('qualishel-google-calendar-token');
        localStorage.removeItem('qualishel-google-calendar-user-email');
        updateGoogleCalendarStatus();
        showEmailNotification('Desconectado do Google Calendar', 'info');
    }
}

// Atualizar status da conexão na interface
function updateGoogleCalendarStatus() {
    const statusElement = document.getElementById('google-calendar-status');
    const notConnectedDiv = document.getElementById('google-calendar-not-connected');
    const connectedDiv = document.getElementById('google-calendar-connected');
    const userEmailSpan = document.getElementById('google-calendar-user-email');
    
    if (googleCalendarToken && googleCalendarToken.access_token) {
        // Verificar se token expirou
        if (googleCalendarToken.expires_at && Date.now() >= googleCalendarToken.expires_at) {
            // Token expirado, desconectar
            disconnectGoogleCalendar();
            return;
        }
        
        if (statusElement) statusElement.textContent = 'Conectado';
        if (notConnectedDiv) notConnectedDiv.style.display = 'none';
        if (connectedDiv) connectedDiv.style.display = 'block';
        
        const savedEmail = localStorage.getItem('qualishel-google-calendar-user-email');
        if (userEmailSpan && savedEmail) {
            userEmailSpan.textContent = savedEmail;
        }
    } else {
        if (statusElement) statusElement.textContent = 'Não conectado';
        if (notConnectedDiv) notConnectedDiv.style.display = 'block';
        if (connectedDiv) connectedDiv.style.display = 'none';
    }
}

// Função para criar evento usando Google Calendar API (requer autenticação)
async function createGoogleCalendarEvent(demand, deadline, startDate = null) {
    try {
        // Verificar se há token válido
        if (!googleCalendarToken || !googleCalendarToken.access_token) {
            console.log('ℹ️ Não autenticado com Google Calendar. Usando método de URL simples.');
            return addToGoogleCalendar(demand, deadline, startDate);
        }
        
        // Verificar se token expirou
        if (googleCalendarToken.expires_at && Date.now() >= googleCalendarToken.expires_at) {
            console.log('⚠️ Token expirado. Desconectando...');
            disconnectGoogleCalendar();
            return addToGoogleCalendar(demand, deadline, startDate);
        }
        
        const deadlineDate = new Date(deadline);
        const start = startDate ? new Date(startDate) : deadlineDate;
        
        // Criar evento
        const event = {
            summary: `Prazo: ${demand.title}`,
            description: `Demanda: ${demand.title}\n` +
                         `Status: ${demand.status}\n` +
                         `Prioridade: ${demand.priority}\n` +
                         `Responsável: ${demand.responsible}\n` +
                         (demand.description ? `\nDescrição: ${demand.description}` : ''),
            location: 'Qualishel - Escritório da Qualidade',
            start: {
                dateTime: start.toISOString(),
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            end: {
                dateTime: deadlineDate.toISOString(),
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'email', minutes: 24 * 60 }, // 1 dia antes
                    { method: 'popup', minutes: 60 } // 1 hora antes
                ]
            }
        };
        
        // Inserir evento no calendário usando a API REST
        const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${googleCalendarToken.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(event)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Erro ao criar evento');
        }
        
        const result = await response.json();
        console.log('✅ Evento criado no Google Calendar:', result);
        
        // Salvar ID do evento na demanda para poder atualizar depois
        if (!demand.googleCalendarEventId) {
            demand.googleCalendarEventId = {};
        }
        demand.googleCalendarEventId[deadline] = result.id;
        saveDemands();
        
        showEmailNotification('✅ Prazo adicionado ao Google Calendar!', 'success');
        
        return result;
    } catch (error) {
        console.error('❌ Erro ao criar evento no Google Calendar:', error);
        
        // Se erro de autenticação, desconectar
        if (error.message.includes('Invalid Credentials') || error.message.includes('401')) {
            disconnectGoogleCalendar();
        }
        
        // Fallback para método de URL simples
        showEmailNotification('⚠️ Erro ao adicionar ao Google Calendar. Abrindo link alternativo...', 'error');
        return addToGoogleCalendar(demand, deadline, startDate);
    }
}
function handleDeadlineSubmit(e) {
    e.preventDefault();
    
    if (pendingDemandId === null) {
        closeDeadlineModal();
        return;
    }
    
    const demand = demands.find(d => d.id === pendingDemandId);
    if (!demand) {
        closeDeadlineModal();
        return;
    }
    
    const dateValue = document.getElementById('deadline-date').value;
    const timeValue = document.getElementById('deadline-time').value;
    const startDateValue = document.getElementById('deadline-start-date')?.value;
    const reasonValue = document.getElementById('deadline-reason')?.value.trim();
    const addToCalendar = document.getElementById('add-to-google-calendar')?.checked || false;
    
    // Validar justificativa
    if (!reasonValue) {
        alert('Por favor, informe a justificativa para a alteração do prazo.');
        return;
    }
    
    // Atualizar data de início se foi alterada
    if (startDateValue) {
        const newStartDate = `${startDateValue}T00:00:00`;
        // Só atualizar se mudou
        if (demand.createdAt !== newStartDate) {
            demand.createdAt = newStartDate;
        }
    }
    
    // Salvar prazo anterior para histórico
    const oldDeadline = demand.deadline || null;
    
    // Combinar data e hora
    let newDeadline = null;
    if (dateValue) {
        if (timeValue) {
            newDeadline = `${dateValue}T${timeValue}:00`;
        } else {
            newDeadline = `${dateValue}T23:59:59`; // Fim do dia se não houver hora
        }
    }
    
    // Inicializar histórico se não existir
    if (!demand.deadlineHistory) {
        demand.deadlineHistory = [];
    }
    
    // Adicionar entrada ao histórico apenas se o prazo mudou
    if (oldDeadline !== newDeadline) {
        const historyEntry = {
            timestamp: new Date().toISOString(),
            author: currentUserName || 'Sistema',
            oldDeadline: oldDeadline,
            newDeadline: newDeadline,
            reason: reasonValue
        };
        
        demand.deadlineHistory.push(historyEntry);
    }
    
    // Atualizar prazo
    demand.deadline = newDeadline;
    
    // Se estava definindo prazo pela primeira vez e não tinha status, definir como andamento
    if (!oldDeadline && newDeadline && demand.status === 'pendente') {
        demand.status = 'andamento';
    }
    
    saveDemands();
    renderKanban();
    updateCardCounts();
    updateDashboard();
    
    // Adicionar ao Google Calendar se solicitado
    if (addToCalendar && newDeadline) {
        const startDate = startDateValue ? `${startDateValue}T00:00:00` : demand.createdAt;
        
        // Se estiver conectado ao Google Calendar, criar automaticamente
        if (googleCalendarToken && googleCalendarToken.access_token) {
            // Verificar se token ainda é válido (se não tiver expires_at, assumir válido)
            const isTokenValid = !googleCalendarToken.expires_at || Date.now() < googleCalendarToken.expires_at;
            
            if (isTokenValid) {
                // Criar automaticamente usando API (sem abrir Google Calendar)
                console.log('📅 Criando evento automaticamente no Google Calendar...');
                createGoogleCalendarEvent(demand, newDeadline, startDate).catch((error) => {
                    console.error('❌ Erro ao criar evento automaticamente:', error);
                    // Se falhar, tentar método de URL como fallback
                    console.log('⚠️ Usando método de URL como fallback');
                    addToGoogleCalendar(demand, newDeadline, startDate);
                });
            } else {
                // Token expirado, usar método de URL
                console.log('⚠️ Token expirado, usando método de URL');
                addToGoogleCalendar(demand, newDeadline, startDate);
            }
        } else {
            // Não conectado, usar método de URL simples
            console.log('ℹ️ Não conectado ao Google Calendar, usando método de URL');
            addToGoogleCalendar(demand, newDeadline, startDate);
        }
    }
    
    pendingDemandId = null;
    closeDeadlineModal();
}

// ========== COLABORADORES ==========

// Função global para acesso via onclick
window.manageCollaborators = function(demandId) {
    currentDemandForCollaborators = demandId;
    const demand = demands.find(d => d.id === demandId);
    if (!demand) return;
    
    if (!demand.collaborators) {
        demand.collaborators = [];
    }
    
    renderCollaboratorsModal();
    openCollaboratorsModal();
};

function openCollaboratorsModal() {
    collaboratorsModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCollaboratorsModal() {
    collaboratorsModal.classList.remove('active');
    document.body.style.overflow = '';
    currentDemandForCollaborators = null;
    document.getElementById('new-collaborator-name').value = '';
    document.getElementById('new-collaborator-email').value = '';
}

function renderCollaboratorsModal() {
    if (currentDemandForCollaborators === null) return;
    
    const demand = demands.find(d => d.id === currentDemandForCollaborators);
    if (!demand) return;
    
    // Renderizar colaboradores atuais
    const currentList = document.getElementById('current-collaborators-list');
    if (demand.collaborators.length === 0) {
        currentList.innerHTML = '<p class="empty-message">Nenhum colaborador adicionado ainda.</p>';
    } else {
        currentList.innerHTML = demand.collaborators.map((collab, index) => {
            const initials = collab.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
            return `
                <div class="collaborator-item">
                    <div class="collaborator-info">
                        <span class="collaborator-avatar-large">${initials}</span>
                        <div>
                            <div class="collaborator-name">${escapeHtml(collab.name)}</div>
                            ${collab.email ? `<div class="collaborator-email">${escapeHtml(collab.email)}</div>` : ''}
                        </div>
                    </div>
                    <button class="btn-remove-collaborator" onclick="removeCollaborator(${index})" title="Remover">✕</button>
                </div>
            `;
        }).join('');
    }
    
    // Renderizar seção de compartilhamento de link
    renderInviteLinkSection(demand);
    
    // Renderizar pessoas disponíveis
    updateAvailablePeopleList();
}

// Função para renderizar seção de compartilhamento de link
function renderInviteLinkSection(demand) {
    const inviteLinkSection = document.getElementById('invite-link-section');
    if (!inviteLinkSection) return;
    
    // Obter tipo de acesso selecionado (padrão: 'card')
    const accessTypeSelect = document.getElementById('invite-access-type');
    const selectedAccessType = accessTypeSelect ? accessTypeSelect.value : 'card';
    
    // Gerar link de convite com o tipo de acesso selecionado
    const inviteData = generatePanelInviteLink(demand.id, demand.panelId, selectedAccessType);
    if (!inviteData) {
        inviteLinkSection.innerHTML = '<p class="empty-message">Erro ao gerar link de convite.</p>';
        return;
    }
    
    const { link, panelName, demandTitle, accessType } = inviteData;
    
    // Escapar para HTML e para JavaScript (atributos onclick)
    const linkEscaped = escapeHtml(link);
    const linkJsEscaped = link.replace(/'/g, "\\'").replace(/"/g, '\\"');
    const demandTitleEscaped = escapeHtml(demandTitle);
    const demandTitleJsEscaped = demandTitle.replace(/'/g, "\\'").replace(/"/g, '\\"');
    const panelNameEscaped = escapeHtml(panelName);
    const panelNameJsEscaped = panelName.replace(/'/g, "\\'").replace(/"/g, '\\"');
    
    const accessTypeLabel = accessType === 'panel' ? 'Painel Completo' : 'Apenas este Card';
    const accessTypeDescription = accessType === 'panel' 
        ? 'O convidado terá acesso a todo o painel e poderá ver e colaborar em todas as demandas.'
        : 'O convidado terá acesso apenas a este card específico e não poderá ver outras demandas do painel.';
    
    inviteLinkSection.innerHTML = `
        <div class="invite-link-container">
            <div class="invite-link-info">
                <h5>🔗 Link de Convite</h5>
                <p class="invite-link-description">
                    Escolha o tipo de acesso e compartilhe o link gerado.
                </p>
                
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label for="invite-access-type" style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--text-primary);">
                        Tipo de Acesso:
                    </label>
                    <select id="invite-access-type" class="invite-access-select" onchange="updateInviteLink()">
                        <option value="card" ${accessType === 'card' ? 'selected' : ''}>📋 Apenas este Card</option>
                        <option value="panel" ${accessType === 'panel' ? 'selected' : ''}>📊 Painel Completo</option>
                    </select>
                    <small style="display: block; margin-top: 0.5rem; color: var(--text-secondary); font-size: 0.75rem;">
                        ${accessTypeDescription}
                    </small>
                </div>
                
                <div class="invite-link-details">
                    <div class="invite-detail-item">
                        <strong>Painel:</strong> ${panelNameEscaped}
                    </div>
                    <div class="invite-detail-item">
                        <strong>Demanda:</strong> ${demandTitleEscaped}
                    </div>
                    <div class="invite-detail-item" style="background: #fef3c7; border-left-color: #f59e0b;">
                        <strong>Permissão:</strong> ${accessTypeLabel}
                    </div>
                </div>
            </div>
            <div class="invite-link-input-group">
                <input type="text" 
                       id="invite-link-input" 
                       value="${linkEscaped}" 
                       readonly 
                       class="invite-link-input"
                       onclick="this.select()">
                <button type="button" 
                        class="btn-primary btn-copy-link" 
                        onclick="copyInviteLink('${linkJsEscaped}')"
                        title="Copiar link">
                    📋 Copiar
                </button>
            </div>
            <div class="invite-share-buttons">
                <button type="button" 
                        class="btn-share btn-share-whatsapp" 
                        onclick="shareInviteViaWhatsApp('${linkJsEscaped}', '${demandTitleJsEscaped}')"
                        title="Compartilhar via WhatsApp">
                    📱 WhatsApp
                </button>
                <button type="button" 
                        class="btn-share btn-share-email" 
                        onclick="shareInviteViaEmail('${linkJsEscaped}', '${demandTitleJsEscaped}', '${panelNameJsEscaped}')"
                        title="Compartilhar via E-mail">
                    ✉️ E-mail
                </button>
            </div>
        </div>
    `;
}

// Função para atualizar o link quando o tipo de acesso mudar
window.updateInviteLink = function() {
    if (currentDemandForCollaborators === null) return;
    const demand = demands.find(d => d.id === currentDemandForCollaborators);
    if (!demand) return;
    renderInviteLinkSection(demand);
};

// Funções globais para acesso via onclick
window.copyInviteLink = async function(link) {
    await copyInviteLinkToClipboard(link);
};

window.shareInviteViaWhatsApp = function(link, demandTitle) {
    shareViaWhatsApp(link, demandTitle);
};

window.shareInviteViaEmail = function(link, demandTitle, panelName) {
    shareViaEmail(link, demandTitle, panelName);
};

function updateAvailablePeopleList() {
    const availableList = document.getElementById('available-people-list');
    if (!availableList) return;
    
    if (availablePeople.length === 0) {
        availableList.innerHTML = '<p class="empty-message">Nenhuma pessoa cadastrada. Adicione pessoas acima.</p>';
        return;
    }
    
    const demand = currentDemandForCollaborators ? demands.find(d => d.id === currentDemandForCollaborators) : null;
    const currentCollaboratorIds = demand && demand.collaborators ? demand.collaborators.map(c => c.name.toLowerCase()) : [];
    
    availableList.innerHTML = availablePeople.map(person => {
        const isAlreadyAdded = currentCollaboratorIds.includes(person.name.toLowerCase());
        const initials = person.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        
        return `
            <div class="collaborator-item ${isAlreadyAdded ? 'disabled' : ''}">
                <div class="collaborator-info">
                    <span class="collaborator-avatar-large">${initials}</span>
                    <div>
                        <div class="collaborator-name">${escapeHtml(person.name)}</div>
                        ${person.email ? `<div class="collaborator-email">${escapeHtml(person.email)}</div>` : ''}
                    </div>
                </div>
                ${isAlreadyAdded ? 
                    '<span class="already-added">✓ Adicionado</span>' : 
                    `<button class="btn-add-collaborator" onclick="addExistingCollaborator('${escapeHtml(person.name)}', '${escapeHtml(person.email || '')}')" title="Adicionar">➕</button>`
                }
            </div>
        `;
    }).join('');
}

async function handleAddCollaborator() {
    const name = document.getElementById('new-collaborator-name').value.trim();
    const email = document.getElementById('new-collaborator-email').value.trim();
    const sendEmail = document.getElementById('send-email-invite').checked;
    
    if (!name) {
        alert('Por favor, informe o nome do colaborador.');
        return;
    }
    
    if (currentDemandForCollaborators === null) return;
    
    const demand = demands.find(d => d.id === currentDemandForCollaborators);
    if (!demand) return;
    
    // Verificar se já existe
    const exists = demand.collaborators.some(c => c.name.toLowerCase() === name.toLowerCase());
    if (exists) {
        alert('Este colaborador já está adicionado a esta demanda.');
        return;
    }
    
    // Adicionar colaborador
    const newCollaborator = { name, email: email || null };
    demand.collaborators.push(newCollaborator);
    
    // Adicionar à lista de pessoas disponíveis se não existir
    const personExists = availablePeople.some(p => p.name.toLowerCase() === name.toLowerCase());
    if (!personExists) {
        availablePeople.push(newCollaborator);
        saveAvailablePeople();
    }
    
    saveDemands();
    renderCollaboratorsModal();
    renderKanban();
    updateCardCounts();
    updateDashboard();
    
    // Enviar e-mail se solicitado e houver e-mail
    if (sendEmail && email) {
        // Obter tipo de acesso selecionado (padrão: 'card')
        const accessTypeSelect = document.getElementById('invite-access-type');
        const selectedAccessType = accessTypeSelect ? accessTypeSelect.value : 'card';
        await sendInviteEmail(name, email, demand, selectedAccessType);
    }
    
    // Limpar campos
    document.getElementById('new-collaborator-name').value = '';
    document.getElementById('new-collaborator-email').value = '';
}

// Função global para acesso via onclick
window.addExistingCollaborator = async function(name, email) {
    if (currentDemandForCollaborators === null) return;
    
    const demand = demands.find(d => d.id === currentDemandForCollaborators);
    if (!demand) return;
    
    // Verificar se já existe
    const exists = demand.collaborators.some(c => c.name.toLowerCase() === name.toLowerCase());
    if (exists) {
        // Perguntar se quer enviar convite mesmo assim
        const sendEmail = email && confirm(`${name} já está no projeto. Deseja enviar um convite por e-mail mesmo assim?`);
        if (sendEmail && email) {
            // Obter tipo de acesso selecionado (padrão: 'card')
            const accessTypeSelect = document.getElementById('invite-access-type');
            const selectedAccessType = accessTypeSelect ? accessTypeSelect.value : 'card';
            await sendInviteEmail(name, email, demand, selectedAccessType);
        }
        return;
    }
    
    // Adicionar colaborador
    const collaborator = { name, email: email || null };
    demand.collaborators.push(collaborator);
    
    saveDemands();
    renderCollaboratorsModal();
    renderKanban();
    updateCardCounts();
    updateDashboard();
    
    // Enviar e-mail se houver e-mail
    if (email) {
        // Obter tipo de acesso selecionado (padrão: 'card')
        const accessTypeSelect = document.getElementById('invite-access-type');
        const selectedAccessType = accessTypeSelect ? accessTypeSelect.value : 'card';
        await sendInviteEmail(name, email, demand, selectedAccessType);
    }
};

// Função global para acesso via onclick
window.removeCollaborator = function(index) {
    if (currentDemandForCollaborators === null) return;
    
    const demand = demands.find(d => d.id === currentDemandForCollaborators);
    if (!demand || !demand.collaborators) return;
    
    demand.collaborators.splice(index, 1);
    
    saveDemands();
    renderCollaboratorsModal();
    renderKanban();
    updateCardCounts();
    updateDashboard();
};

function saveAvailablePeople() {
    // Sempre salvar no localStorage primeiro (rápido)
    localStorage.setItem('qualishel-people', JSON.stringify(availablePeople));
    
    // Tentar salvar no Firebase em background (se disponível)
    if (typeof window.firebaseService !== 'undefined' && window.firebaseService.isInitialized()) {
        window.firebaseService.savePeopleToStorage(availablePeople).catch(err => {
            console.warn('Erro ao sincronizar pessoas com Firebase:', err);
        });
    }
}

// ========== GERAR LINK DE CONVITE ==========

// Variáveis globais para controle de acesso
let currentUserAccessType = null; // 'full', 'panel', 'card' ou null
let currentUserRestrictedDemandId = null; // ID da demanda se acesso for apenas ao card
let currentUserRestrictedPanelId = null; // ID do painel se acesso for limitado
let pendingInvite = null; // Armazena informações do convite pendente {demandId, panelId}

// Função reutilizável para gerar link de convite do painel
// accessType: 'panel' = acesso ao painel completo, 'card' = acesso apenas ao card
function generatePanelInviteLink(demandId, panelId = null, accessType = 'card') {
    const demand = demands.find(d => d.id === demandId);
    if (!demand) {
        console.error('Demanda não encontrada:', demandId);
        return null;
    }
    
    // Obter informações do painel
    const validPanelId = panelId || demand.panelId || currentPanelId;
    const panel = panels.find(p => p.id === validPanelId);
    const panelName = panel ? panel.name : 'Painel Principal';
    
    // Obter URL do site (para o link de acesso)
    // IMPORTANTE: Sempre usar URL de produção para links de convite
    let siteUrl = window.location.origin;
    let isUsingProductionUrl = false;
    
    // Se estiver em localhost, file://, ou 127.0.0.1, OBRIGAR uso de URL de produção
    if (siteUrl.includes('localhost') || siteUrl.includes('127.0.0.1') || siteUrl.startsWith('file://')) {
        // Tentar obter URL de produção salva
        const savedProductionUrl = localStorage.getItem('qualishel-production-url');
        if (savedProductionUrl && savedProductionUrl.trim()) {
            // Limpar a URL - remover qualquer caminho local que possa ter sido incluído
            let cleanUrl = savedProductionUrl.trim();
            // Remover caminhos do Windows (C:, D:, etc.)
            cleanUrl = cleanUrl.replace(/\/[A-Z]:\/.*$/, '');
            // Tentar extrair apenas o domínio usando URL object
            try {
                const urlObj = new URL(cleanUrl);
                cleanUrl = `${urlObj.protocol}//${urlObj.host}`;
            } catch (e) {
                // Se falhar, tentar limpar manualmente
                cleanUrl = cleanUrl.replace(/\/C:.*$/, '').replace(/\/[^\/]*\.html.*$/, '');
                // Garantir que começa com http:// ou https://
                if (!cleanUrl.match(/^https?:\/\//)) {
                    if (cleanUrl.startsWith('//')) {
                        cleanUrl = 'https:' + cleanUrl;
                    } else {
                        cleanUrl = 'https://' + cleanUrl.replace(/^\/+/, '');
                    }
                }
            }
            siteUrl = cleanUrl;
            isUsingProductionUrl = true;
            console.log('✅ Usando URL de produção salva (limpa):', siteUrl);
        } else {
            // Se não tiver salva, mostrar erro e pedir para configurar
            const errorMsg = '⚠️ URL de produção não configurada! Configure nas Configurações antes de enviar convites.';
            console.error('❌', errorMsg);
            alert('⚠️ ATENÇÃO: URL de produção não configurada!\n\nPara enviar convites, você precisa configurar a URL de produção (ex: https://shel-quali.vercel.app) nas Configurações.\n\nVá em: Configurações → URL de Produção');
            return null;
        }
    }
    
    // IMPORTANTE: Se estiver usando URL de produção, NÃO incluir pathname local
    // Apenas usar o pathname se estiver na mesma origem (não é produção remota)
    if (!isUsingProductionUrl) {
        const pathname = window.location.pathname;
        // Se estiver em um subdiretório, manter o caminho base
        if (pathname && pathname !== '/' && pathname !== '/index.html') {
            const pathParts = pathname.split('/').filter(p => p && p !== 'index.html');
            if (pathParts.length > 0) {
                siteUrl += '/' + pathParts.join('/');
            }
        }
    }
    
    // Limpar a URL: remover barra dupla, remover barra final, garantir formato correto
    siteUrl = siteUrl.replace(/\/+/g, '/').replace(/\/$/, '');
    // Garantir que não há caminhos locais do Windows (C:, D:, etc.) - limpeza final
    siteUrl = siteUrl.replace(/\/[A-Z]:\/.*$/, '').replace(/\/C:.*$/, '');
    
    // Construir link com tipo de acesso
    // Sempre usar /index.html para produção
    let accessLink = `${siteUrl}/index.html?demand=${demandId}&panel=${validPanelId}&invite=true`;
    
    // Log para debug
    console.log('🔗 Link gerado:', accessLink);
    if (accessType === 'panel') {
        accessLink += '&access=panel';
    } else {
        accessLink += '&access=card';
    }
    
    return {
        link: accessLink,
        panelName: panelName,
        demandTitle: demand.title,
        accessType: accessType
    };
}

// Função para copiar link para área de transferência
async function copyInviteLinkToClipboard(link) {
    try {
        await navigator.clipboard.writeText(link);
        showNotification('Link copiado para a área de transferência!', 'success');
        return true;
    } catch (err) {
        // Fallback para navegadores mais antigos
        const textArea = document.createElement('textarea');
        textArea.value = link;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showNotification('Link copiado para a área de transferência!', 'success');
            return true;
        } catch (err2) {
            document.body.removeChild(textArea);
            showNotification('Erro ao copiar link. Tente selecionar e copiar manualmente.', 'error');
            return false;
        }
    }
}

// Função para compartilhar via WhatsApp
function shareViaWhatsApp(link, demandTitle) {
    const message = encodeURIComponent(`Olá! Você foi convidado para participar do painel no Qualishel.\n\nDemanda: ${demandTitle}\n\nAcesse: ${link}`);
    window.open(`https://wa.me/?text=${message}`, '_blank');
}

// Função para compartilhar via E-mail
function shareViaEmail(link, demandTitle, panelName) {
    const subject = encodeURIComponent(`Convite para participar do painel: ${panelName}`);
    const body = encodeURIComponent(`Olá!\n\nVocê foi convidado para participar do painel no Qualishel.\n\nDemanda: ${demandTitle}\nPainel: ${panelName}\n\nAcesse o link: ${link}\n\nAtenciosamente,`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

// Função para mostrar notificação
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `invite-notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        z-index: 10000;
        animation: slideIn 0.3s ease;
        max-width: 400px;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// ========== CONFIGURAÇÃO DE E-MAIL (EmailJS) ==========

let emailConfig = {
    publicKey: '',
    serviceId: '',
    templateId: ''
};

function loadEmailConfig() {
    const saved = localStorage.getItem('qualishel-email-config');
    if (saved) {
        emailConfig = JSON.parse(saved);
        
        // Preencher campos do modal de colaboradores se existirem
        const publicKeyInput = document.getElementById('emailjs-public-key');
        const serviceIdInput = document.getElementById('emailjs-service-id');
        const templateIdInput = document.getElementById('emailjs-template-id');
        
        if (publicKeyInput) publicKeyInput.value = emailConfig.publicKey || '';
        if (serviceIdInput) serviceIdInput.value = emailConfig.serviceId || '';
        if (templateIdInput) templateIdInput.value = emailConfig.templateId || '';

        // Preencher campos da página de configurações se existirem
        const settingsPublicKeyInput = document.getElementById('settings-emailjs-public-key');
        const settingsServiceIdInput = document.getElementById('settings-emailjs-service-id');
        const settingsTemplateIdInput = document.getElementById('settings-emailjs-template-id');
        
        if (settingsPublicKeyInput) settingsPublicKeyInput.value = emailConfig.publicKey || '';
        if (settingsServiceIdInput) settingsServiceIdInput.value = emailConfig.serviceId || '';
        if (settingsTemplateIdInput) settingsTemplateIdInput.value = emailConfig.templateId || '';
    }
    
    // Carregar nome do usuário
    const savedUserName = localStorage.getItem('qualishel-user-name');
    if (savedUserName) {
        currentUserName = savedUserName;
        const userNameInput = document.getElementById('user-name');
        if (userNameInput) userNameInput.value = savedUserName;
    }
    
    updateEmailStatus();
}

function saveEmailConfig() {
    const publicKeyInput = document.getElementById('emailjs-public-key');
    const serviceIdInput = document.getElementById('emailjs-service-id');
    const templateIdInput = document.getElementById('emailjs-template-id');
    
    const publicKey = publicKeyInput ? publicKeyInput.value.trim() : '';
    const serviceId = serviceIdInput ? serviceIdInput.value.trim() : '';
    const templateId = templateIdInput ? templateIdInput.value.trim() : '';
    
    if (!publicKey || !serviceId || !templateId) {
        alert('Por favor, preencha todos os campos obrigatórios.');
        return;
    }
    
    emailConfig = {
        publicKey,
        serviceId,
        templateId
    };
    
    localStorage.setItem('qualishel-email-config', JSON.stringify(emailConfig));
    
    // Reinicializar EmailJS
    initializeEmailJS();
    
    // Sincronizar com página de configurações
    const settingsPublicKeyInput = document.getElementById('settings-emailjs-public-key');
    const settingsServiceIdInput = document.getElementById('settings-emailjs-service-id');
    const settingsTemplateIdInput = document.getElementById('settings-emailjs-template-id');
    
    if (settingsPublicKeyInput) settingsPublicKeyInput.value = publicKey;
    if (settingsServiceIdInput) settingsServiceIdInput.value = serviceId;
    if (settingsTemplateIdInput) settingsTemplateIdInput.value = templateId;
    
    updateEmailStatus();
    showEmailNotification('Configuração de e-mail salva com sucesso!', 'success');
}

function saveEmailConfigFromSettings() {
    const publicKeyInput = document.getElementById('settings-emailjs-public-key');
    const serviceIdInput = document.getElementById('settings-emailjs-service-id');
    const templateIdInput = document.getElementById('settings-emailjs-template-id');
    
    const publicKey = publicKeyInput ? publicKeyInput.value.trim() : '';
    const serviceId = serviceIdInput ? serviceIdInput.value.trim() : '';
    const templateId = templateIdInput ? templateIdInput.value.trim() : '';
    
    if (!publicKey || !serviceId || !templateId) {
        alert('Por favor, preencha todos os campos obrigatórios.');
        return;
    }
    
    emailConfig = {
        publicKey,
        serviceId,
        templateId
    };
    
    localStorage.setItem('qualishel-email-config', JSON.stringify(emailConfig));
    
    // Reinicializar EmailJS
    initializeEmailJS();
    
    // Sincronizar com modal de colaboradores
    const modalPublicKeyInput = document.getElementById('emailjs-public-key');
    const modalServiceIdInput = document.getElementById('emailjs-service-id');
    const modalTemplateIdInput = document.getElementById('emailjs-template-id');
    
    if (modalPublicKeyInput) modalPublicKeyInput.value = publicKey;
    if (modalServiceIdInput) modalServiceIdInput.value = serviceId;
    if (modalTemplateIdInput) modalTemplateIdInput.value = templateId;
    
    updateEmailStatus();
    showEmailNotification('Configuração de e-mail salva com sucesso!', 'success');
}

function updateEmailStatus() {
    const statusElement = document.getElementById('email-status');
    if (!statusElement) return;
    
    if (emailConfig.publicKey && emailConfig.serviceId && emailConfig.templateId) {
        statusElement.textContent = '✓ Configurado';
        statusElement.className = 'settings-status status-configured';
    } else {
        statusElement.textContent = 'Não configurado';
        statusElement.className = 'settings-status status-not-configured';
    }
}

// ========== CONFIGURAÇÃO DE URL DE PRODUÇÃO ==========

function loadProductionUrl() {
    let savedUrl = localStorage.getItem('qualishel-production-url');
    const input = document.getElementById('production-url-input');
    
    // Se a URL salva contém caminhos locais, limpar automaticamente
    if (savedUrl && (savedUrl.includes('C:/') || savedUrl.includes('C:\\') || savedUrl.includes('/C:'))) {
        console.warn('⚠️ URL de produção contém caminho local. Limpando...');
        try {
            const urlObj = new URL(savedUrl);
            savedUrl = `${urlObj.protocol}//${urlObj.host}`;
            localStorage.setItem('qualishel-production-url', savedUrl);
            console.log('✅ URL limpa e salva:', savedUrl);
        } catch (e) {
            // Se não conseguir limpar, remover completamente
            console.error('❌ URL inválida. Removendo do localStorage.');
            localStorage.removeItem('qualishel-production-url');
            savedUrl = null;
        }
    }
    
    if (input && savedUrl) {
        input.value = savedUrl;
    }
    updateProductionUrlStatus();
}
function saveProductionUrl() {
    const input = document.getElementById('production-url-input');
    if (!input) return;
    
    const url = input.value.trim();
    
    if (!url) {
        alert('Por favor, informe a URL de produção.');
        return;
    }
    
    // Validar formato de URL
    try {
        const urlObj = new URL(url);
        if (!urlObj.protocol.startsWith('http')) {
            throw new Error('URL deve começar com http:// ou https://');
        }
    } catch (error) {
        alert('URL inválida. Por favor, use um formato válido (ex: https://shel-quali.vercel.app)');
        return;
    }
    
    // Remover barra final e limpar completamente
    let cleanUrl = url.replace(/\/$/, '');
    // Remover qualquer caminho local que possa ter sido incluído
    cleanUrl = cleanUrl.replace(/\/[A-Z]:\/.*$/, '').replace(/\/C:.*$/, '');
    // Garantir que é apenas o domínio
    try {
        const urlObj = new URL(cleanUrl);
        cleanUrl = `${urlObj.protocol}//${urlObj.host}`;
    } catch (e) {
        // Se falhar, manter como está mas limpar caminhos locais
        cleanUrl = cleanUrl.replace(/\/C:.*$/, '').replace(/\/[^\/]*\.html.*$/, '');
    }
    
    localStorage.setItem('qualishel-production-url', cleanUrl);
    updateProductionUrlStatus();
    showEmailNotification('URL de produção salva com sucesso!', 'success');
    
    console.log('✅ URL de produção salva:', cleanUrl);
}

function updateProductionUrlStatus() {
    const statusElement = document.getElementById('production-url-status');
    if (!statusElement) return;
    
    const savedUrl = localStorage.getItem('qualishel-production-url');
    if (savedUrl && savedUrl.trim()) {
        statusElement.textContent = '✓ Configurado';
        statusElement.className = 'settings-status status-configured';
    } else {
        statusElement.textContent = 'Não configurado';
        statusElement.className = 'settings-status status-not-configured';
    }
}

function testProductionUrl() {
    const input = document.getElementById('production-url-input');
    if (!input) return;
    
    const url = input.value.trim();
    
    if (!url) {
        alert('Por favor, informe a URL de produção primeiro.');
        return;
    }
    
    // Abrir URL em nova aba
    window.open(url, '_blank');
    showEmailNotification('Abrindo URL em nova aba...', 'info');
}

async function testEmailSend() {
    const testEmailInput = prompt('Digite um e-mail para enviar o teste:');
    
    if (!testEmailInput || !testEmailInput.trim()) {
        return;
    }
    
    if (!emailConfig.publicKey || !emailConfig.serviceId || !emailConfig.templateId) {
        alert('Por favor, configure o EmailJS primeiro antes de testar.');
        return;
    }
    
    // Criar uma demanda de teste
    const testPanel = panels.find(p => p.id === currentPanelId);
    const testDemand = {
        title: 'Teste de E-mail - Qualishel',
        description: 'Este é um e-mail de teste do sistema Qualishel. Se você recebeu esta mensagem, a configuração está funcionando corretamente!',
        status: 'pendente',
        priority: 'media',
        responsible: currentUserName || 'Sistema',
        panelId: currentPanelId || null
    };
    
    try {
        await sendInviteEmail('Usuário de Teste', testEmailInput.trim(), testDemand);
    } catch (error) {
        console.error('Erro no teste:', error);
    }
}

// Função para testar se o link está sendo gerado e enviado corretamente
async function testInviteLink() {
    console.log('🧪 ========== TESTE DE LINK DE CONVITE ==========');
    
    // Verificar se há demandas disponíveis
    if (!demands || demands.length === 0) {
        console.error('❌ Nenhuma demanda encontrada. Crie uma demanda primeiro.');
        alert('❌ Nenhuma demanda encontrada. Crie uma demanda primeiro.');
        return;
    }
    
    // Usar a primeira demanda disponível ou a demanda atual
    const testDemand = demands[0];
    const demandId = testDemand.id;
    const panelId = testDemand.panelId || currentPanelId;
    
    console.log('📋 Demanda de teste:', {
        id: demandId,
        title: testDemand.title,
        panelId: panelId
    });
    
    // Testar geração de link para acesso ao card
    console.log('\n🔗 Testando geração de link (acesso ao card)...');
    const inviteDataCard = generatePanelInviteLink(demandId, panelId, 'card');
    
    if (!inviteDataCard) {
        console.error('❌ Falha ao gerar link de acesso ao card');
        alert('❌ Falha ao gerar link. Verifique se a URL de produção está configurada.');
        return;
    }
    
    console.log('✅ Link gerado com sucesso!');
    console.log('📧 Link de acesso:', inviteDataCard.link);
    console.log('📋 Nome do painel:', inviteDataCard.panelName);
    console.log('🔐 Tipo de acesso:', inviteDataCard.accessType);
    
    // Testar geração de link para acesso ao painel completo
    console.log('\n🔗 Testando geração de link (acesso ao painel completo)...');
    const inviteDataPanel = generatePanelInviteLink(demandId, panelId, 'panel');
    
    if (inviteDataPanel) {
        console.log('✅ Link de painel gerado:', inviteDataPanel.link);
    }
    
    // Verificar se o link está sendo incluído nos parâmetros do template
    console.log('\n📧 Verificando parâmetros que seriam enviados ao EmailJS...');
    
    const accessLink = inviteDataCard.link;
    const panelName = inviteDataCard.panelName;
    const accessTypeLabel = 'Apenas este Card';
    
    // Obter URL do site
    let siteUrl = window.location.origin;
    if (siteUrl.includes('localhost') || siteUrl.includes('127.0.0.1') || siteUrl.startsWith('file://')) {
        const savedProductionUrl = localStorage.getItem('qualishel-production-url');
        if (savedProductionUrl && savedProductionUrl.trim()) {
            siteUrl = savedProductionUrl.trim();
        }
    }
    
    const messageWithLink = `Você foi convidado para colaborar na demanda "${testDemand.title}" do painel "${panelName}". Tipo de acesso: ${accessTypeLabel}.

Para acessar o painel, clique no link abaixo:
${accessLink}

Ou copie e cole o link no seu navegador:
${accessLink}`;
    
    const templateParams = {
        to_name: 'Nome do Convidado',
        to_email: 'email@exemplo.com',
        demand_title: testDemand.title,
        demand_description: testDemand.description || 'Sem descrição',
        demand_status: testDemand.status === 'pendente' ? 'Pendente' : 
                      testDemand.status === 'andamento' ? 'Em Andamento' : 
                      testDemand.status === 'revisao' ? 'Em Revisão' : 'Concluído',
        demand_priority: testDemand.priority === 'baixa' ? 'Baixa' : 
                       testDemand.priority === 'media' ? 'Média' : 
                       testDemand.priority === 'alta' ? 'Alta' : 'Urgente',
        demand_responsible: testDemand.responsible,
        panel_name: panelName,
        from_name: 'Escritório da Qualidade',
        message: messageWithLink,
        access_link: accessLink,
        access_type: accessTypeLabel,
        site_url: siteUrl,
        link_text: 'Acessar Qualishel',
        link_url: accessLink
    };
    
    console.log('📋 Parâmetros do template:');
    console.table(templateParams);
    
    // Verificar se access_link está presente
    if (templateParams.access_link && templateParams.access_link.includes('demand=')) {
        console.log('✅ Link está presente nos parâmetros!');
        console.log('🔗 access_link:', templateParams.access_link);
        console.log('🔗 link_url:', templateParams.link_url);
    } else {
        console.error('❌ Link NÃO está presente ou está incorreto nos parâmetros!');
    }
    
    // Verificar se link está na mensagem
    if (messageWithLink.includes(accessLink)) {
        console.log('✅ Link está incluído na mensagem!');
    } else {
        console.error('❌ Link NÃO está incluído na mensagem!');
    }
    
    // Perguntar se quer enviar um e-mail de teste
    console.log('\n📧 Deseja enviar um e-mail de teste?');
    const sendTest = confirm('Deseja enviar um e-mail de teste para verificar se o link está sendo enviado corretamente?');
    
    if (sendTest) {
        const testEmail = prompt('Digite seu e-mail para receber o teste:');
        if (testEmail && testEmail.trim()) {
            console.log('📤 Enviando e-mail de teste...');
            try {
                // Criar demanda temporária com ID para o teste
                const testDemandWithId = {
                    ...testDemand,
                    id: demandId
                };
                await sendInviteEmail('Teste de Link', testEmail.trim(), testDemandWithId, 'card');
                console.log('✅ E-mail de teste enviado! Verifique sua caixa de entrada.');
            } catch (error) {
                console.error('❌ Erro ao enviar e-mail de teste:', error);
            }
        }
    }
    
    console.log('\n🧪 ========== FIM DO TESTE ==========');
    console.log('\n💡 Dica: Verifique o console acima para ver todos os detalhes do link gerado.');
    
    // Mostrar resumo visual
    alert(`✅ Teste concluído!\n\nLink gerado: ${accessLink}\n\nVerifique o console para mais detalhes.`);
}

// Tornar a função acessível globalmente para teste no console
window.testInviteLink = testInviteLink;

function saveUserName() {
    const userNameInput = document.getElementById('user-name');
    const userName = userNameInput ? userNameInput.value.trim() : '';
    
    if (!userName) {
        alert('Por favor, informe seu nome.');
        return;
    }
    
    currentUserName = userName;
    localStorage.setItem('qualishel-user-name', userName);
    
    // Salvar preferência de notificações
    const notificationsCheckbox = document.getElementById('notifications-enabled');
    if (notificationsCheckbox) {
        localStorage.setItem('qualishel-notifications-enabled', notificationsCheckbox.checked ? 'true' : 'false');
    }
    
    showEmailNotification('Configurações salvas com sucesso!', 'success');
}

function loadSettingsPage() {
    // Carregar URL de produção
    loadProductionUrl();
    // Carregar configurações de e-mail
    loadEmailConfig();
    updateEmailStatus();
    
    // Carregar token do Google Calendar
    loadGoogleCalendarToken();
    loadGoogleCalendarClientId();
    updateGoogleCalendarStatus();
    
    // Preencher Client ID se existir
    if (googleCalendarClientId) {
        const clientIdInput = document.getElementById('google-calendar-client-id');
        if (clientIdInput) {
            clientIdInput.value = googleCalendarClientId;
        }
    }
    
    // Garantir que os campos estão preenchidos
    if (emailConfig.publicKey) {
        const publicKeyInput = document.getElementById('settings-emailjs-public-key');
        if (publicKeyInput) publicKeyInput.value = emailConfig.publicKey;
    }
    if (emailConfig.serviceId) {
        const serviceIdInput = document.getElementById('settings-emailjs-service-id');
        if (serviceIdInput) serviceIdInput.value = emailConfig.serviceId;
    }
    if (emailConfig.templateId) {
        const templateIdInput = document.getElementById('settings-emailjs-template-id');
        if (templateIdInput) templateIdInput.value = emailConfig.templateId;
    }
    
    // Carregar nome do usuário
    const savedUserName = localStorage.getItem('qualishel-user-name');
    if (savedUserName) {
        const userNameInput = document.getElementById('user-name');
        if (userNameInput) userNameInput.value = savedUserName;
    }
    
    // Carregar preferência de notificações (padrão: habilitado)
    const notificationsEnabled = localStorage.getItem('qualishel-notifications-enabled') !== 'false';
    const notificationsCheckbox = document.getElementById('notifications-enabled');
    if (notificationsCheckbox) {
        notificationsCheckbox.checked = notificationsEnabled;
    }
    
    // Carregar preferência de adição automática ao calendário
    const autoAddEnabled = localStorage.getItem('qualishel-auto-add-to-calendar') !== 'false';
    const autoAddCheckbox = document.getElementById('auto-add-to-calendar');
    if (autoAddCheckbox) {
        autoAddCheckbox.checked = autoAddEnabled;
        autoAddCheckbox.addEventListener('change', (e) => {
            localStorage.setItem('qualishel-auto-add-to-calendar', e.target.checked ? 'true' : 'false');
        });
    }
}

function initializeEmailJS() {
    console.log('🔧 Inicializando EmailJS...');
    console.log('📋 Configuração atual:', emailConfig);
    
    // Verificar se a biblioteca está carregada - tentar múltiplas formas
    let emailjsLib = null;
    
    // Tentar emailjs global
    if (typeof emailjs !== 'undefined') {
        emailjsLib = emailjs;
        console.log('✅ EmailJS encontrado como variável global');
    }
    // Tentar window.emailjs
    else if (typeof window !== 'undefined' && typeof window.emailjs !== 'undefined') {
        emailjsLib = window.emailjs;
        console.log('✅ EmailJS encontrado via window.emailjs');
    }
    // Tentar emailjs do módulo
    else if (typeof window !== 'undefined' && window.emailjs) {
        emailjsLib = window.emailjs;
        console.log('✅ EmailJS encontrado no window');
    }
    else {
        console.error('❌ EmailJS não está disponível. Verifique o carregamento da biblioteca.');
        console.error('💡 Dica: Verifique se o script está carregado: https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js');
        return false;
    }
    
    // Verificar se a configuração está completa
    if (!emailConfig.publicKey) {
        console.warn('⚠️ Public Key não configurada.');
        return false;
    }
    
    if (!emailConfig.serviceId) {
        console.warn('⚠️ Service ID não configurado.');
        return false;
    }
    
    if (!emailConfig.templateId) {
        console.warn('⚠️ Template ID não configurado.');
        return false;
    }
    
    try {
        // Inicializar EmailJS
        emailjsLib.init(emailConfig.publicKey);
        console.log('✅ EmailJS inicializado com sucesso!');
        console.log('🔑 Public Key:', emailConfig.publicKey);
        console.log('🔧 Service ID:', emailConfig.serviceId);
        console.log('📝 Template ID:', emailConfig.templateId);
        
        // Tornar disponível globalmente
        if (typeof emailjs === 'undefined') {
            window.emailjs = emailjsLib;
        }
        
        return true;
    } catch (error) {
        console.error('❌ Erro ao inicializar EmailJS:', error);
        return false;
    }
}

// Função de diagnóstico para verificar configuração do EmailJS
function diagnoseEmailJS() {
    console.log('🔍 Diagnóstico do EmailJS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Verificar biblioteca
    const hasEmailJS = typeof emailjs !== 'undefined' || 
                      (typeof window !== 'undefined' && typeof window.emailjs !== 'undefined');
    console.log('📚 Biblioteca carregada:', hasEmailJS ? '✅ Sim' : '❌ Não');
    
    // Verificar configuração
    console.log('⚙️ Configuração:');
    console.log('  - Public Key:', emailConfig.publicKey ? '✅ Configurado' : '❌ Não configurado');
    console.log('  - Service ID:', emailConfig.serviceId ? '✅ Configurado' : '❌ Não configurado');
    console.log('  - Template ID:', emailConfig.templateId ? '✅ Configurado' : '❌ Não configurado');
    
    // Verificar valores
    if (emailConfig.publicKey) {
        console.log('  - Public Key valor:', emailConfig.publicKey.substring(0, 10) + '...');
    }
    if (emailConfig.serviceId) {
        console.log('  - Service ID valor:', emailConfig.serviceId);
    }
    if (emailConfig.templateId) {
        console.log('  - Template ID valor:', emailConfig.templateId);
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    return {
        libraryLoaded: hasEmailJS,
        publicKey: !!emailConfig.publicKey,
        serviceId: !!emailConfig.serviceId,
        templateId: !!emailConfig.templateId,
        allConfigured: hasEmailJS && emailConfig.publicKey && emailConfig.serviceId && emailConfig.templateId
    };
}

// Tornar função de diagnóstico disponível globalmente
window.diagnoseEmailJS = diagnoseEmailJS;

async function sendInviteEmail(collaboratorName, collaboratorEmail, demand, accessType = 'card') {
    console.log('📧 Iniciando envio de e-mail...');
    console.log('👤 Para:', collaboratorEmail);
    console.log('📋 Demanda:', demand.title);
    console.log('🔐 Tipo de acesso:', accessType);
    
    // Verificar se EmailJS está configurado
    if (!emailConfig.publicKey || !emailConfig.serviceId || !emailConfig.templateId) {
        const errorMsg = 'EmailJS não configurado. Configure nas opções para enviar e-mails.';
        console.warn('⚠️', errorMsg);
        console.warn('📋 Configuração atual:', emailConfig);
        showEmailNotification(errorMsg, 'error');
        return false;
    }
    
    // Verificar se a biblioteca está carregada - tentar múltiplas formas
    let emailjsLib = null;
    
    if (typeof emailjs !== 'undefined') {
        emailjsLib = emailjs;
        console.log('✅ EmailJS encontrado como variável global');
    } else if (typeof window !== 'undefined' && typeof window.emailjs !== 'undefined') {
        emailjsLib = window.emailjs;
        console.log('✅ EmailJS encontrado via window.emailjs');
    } else {
        const errorMsg = 'Biblioteca EmailJS não carregada. Recarregue a página ou verifique o console.';
        console.error('❌', errorMsg);
        console.error('💡 Execute diagnoseEmailJS() no console para mais detalhes');
        showEmailNotification(errorMsg, 'error');
        return false;
    }
    
    // Garantir que EmailJS está inicializado
    if (!emailConfig.publicKey) {
        const errorMsg = 'Public Key não configurada. Configure nas opções.';
        console.error('❌', errorMsg);
        showEmailNotification(errorMsg, 'error');
        return false;
    }
    
    // Reinicializar se necessário
    try {
        emailjsLib.init(emailConfig.publicKey);
        console.log('✅ EmailJS reinicializado');
    } catch (initError) {
        console.warn('⚠️ Erro ao reinicializar EmailJS (pode já estar inicializado):', initError);
    }
    
    try {
        // Usar função reutilizável para gerar link com o tipo de acesso
        const inviteData = generatePanelInviteLink(demand.id, demand.panelId, accessType);
        if (!inviteData) {
            throw new Error('Não foi possível gerar o link de convite');
        }
        
        const accessLink = inviteData.link;
        const panelName = inviteData.panelName;
        const accessTypeLabel = accessType === 'panel' ? 'Painel Completo' : 'Apenas este Card';
        
        // Obter URL do site para o template
        // IMPORTANTE: Sempre usar URL de produção para links de convite
        let siteUrl = window.location.origin;
        
        // Se estiver em localhost, file://, ou 127.0.0.1, OBRIGAR uso de URL de produção
        if (siteUrl.includes('localhost') || siteUrl.includes('127.0.0.1') || siteUrl.startsWith('file://')) {
            const savedProductionUrl = localStorage.getItem('qualishel-production-url');
            if (savedProductionUrl && savedProductionUrl.trim()) {
                siteUrl = savedProductionUrl.trim();
                console.log('✅ Usando URL de produção para e-mail:', siteUrl);
            } else {
                const errorMsg = 'URL de produção não configurada. Configure nas Configurações antes de enviar convites.';
                console.error('❌', errorMsg);
                showEmailNotification('⚠️ Configure a URL de produção nas Configurações antes de enviar convites!', 'error');
                return false;
            }
        }
        
        console.log('📧 Link de convite gerado:', accessLink);
        console.log('📧 Tipo de acesso:', accessTypeLabel);
        
        // Preparar dados do template
        // Criar mensagem com link explícito
        const messageWithLink = `Você foi convidado para colaborar na demanda "${demand.title}" do painel "${panelName}". Tipo de acesso: ${accessTypeLabel}.

Para acessar o painel, clique no link abaixo:
${accessLink}

Ou copie e cole o link no seu navegador:
${accessLink}`;

        const templateParams = {
            to_name: collaboratorName,
            to_email: collaboratorEmail,
            demand_title: demand.title,
            demand_description: demand.description || 'Sem descrição',
            demand_status: demand.status === 'pendente' ? 'Pendente' : 
                          demand.status === 'andamento' ? 'Em Andamento' : 
                          demand.status === 'revisao' ? 'Em Revisão' : 'Concluído',
            demand_priority: demand.priority === 'baixa' ? 'Baixa' : 
                           demand.priority === 'media' ? 'Média' : 
                           demand.priority === 'alta' ? 'Alta' : 'Urgente',
            demand_responsible: demand.responsible,
            panel_name: panelName,
            from_name: 'Escritório da Qualidade',
            message: messageWithLink,
            access_link: accessLink,
            access_type: accessTypeLabel,
            site_url: siteUrl,
            // Adicionar variáveis adicionais para facilitar uso no template
            link_text: 'Acessar Qualishel',
            link_url: accessLink
        };
        
        console.log('📤 Enviando e-mail via EmailJS...');
        console.log('🔧 Service ID:', emailConfig.serviceId);
        console.log('📝 Template ID:', emailConfig.templateId);
        console.log('📋 Parâmetros do template:', templateParams);
        
        // Verificar se o método send existe
        if (typeof emailjsLib.send !== 'function') {
            throw new Error('Método emailjs.send não está disponível. Verifique a versão da biblioteca EmailJS.');
        }
        
        // Enviar e-mail
        console.log('📧 Chamando emailjs.send...');
        const response = await emailjsLib.send(
            emailConfig.serviceId,
            emailConfig.templateId,
            templateParams
        );
        
        console.log('✅ E-mail enviado com sucesso!');
        console.log('📧 Resposta do EmailJS:', response);
        console.log('👤 Para:', collaboratorEmail);
        
        // Mostrar notificação visual
        showEmailNotification(`E-mail enviado com sucesso para ${collaboratorEmail}!`, 'success');
        return true;
        
    } catch (error) {
        console.error('❌ Erro ao enviar e-mail:', error);
        console.error('📋 Detalhes do erro:', {
            message: error.message,
            text: error.text,
            status: error.status,
            config: emailConfig
        });
        
        let errorMessage = 'Erro ao enviar e-mail. ';
        if (error.text) {
            errorMessage += error.text;
        } else if (error.message) {
            errorMessage += error.message;
        } else {
            errorMessage += 'Verifique a configuração do EmailJS.';
        }
        
        showEmailNotification(errorMessage, 'error');
        return false;
    }
}

function showEmailNotification(message, type) {
    // Criar notificação visual
    const notification = document.createElement('div');
    notification.className = `email-notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : '#ef4444'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// ========== NOTIFICAÇÕES DE ATUALIZAÇÃO ==========

// Função para enviar notificações de atualização aos colaboradores
async function notifyCollaboratorsAboutUpdate(demand, updateType, updateDetails = {}) {
    // Verificar se notificações estão habilitadas (padrão: sim)
    const notificationsEnabled = localStorage.getItem('qualishel-notifications-enabled') !== 'false';
    if (!notificationsEnabled) {
        console.log('ℹ️ Notificações por e-mail desabilitadas');
        return;
    }
    
    // Verificar se há colaboradores com e-mail
    if (!demand.collaborators || demand.collaborators.length === 0) {
        console.log('ℹ️ Nenhum colaborador para notificar');
        return;
    }
    
    // Filtrar colaboradores que têm e-mail
    const collaboratorsWithEmail = demand.collaborators.filter(c => c.email && c.email.trim());
    if (collaboratorsWithEmail.length === 0) {
        console.log('ℹ️ Nenhum colaborador com e-mail para notificar');
        return;
    }
    
    // Verificar se EmailJS está configurado
    if (!emailConfig.publicKey || !emailConfig.serviceId || !emailConfig.templateId) {
        console.log('ℹ️ EmailJS não configurado. Notificações não serão enviadas.');
        return;
    }
    
    // Gerar link de acesso
    const inviteData = generatePanelInviteLink(demand.id, demand.panelId, 'card');
    if (!inviteData) {
        console.warn('⚠️ Não foi possível gerar link para notificação');
        return;
    }
    
    const accessLink = inviteData.link;
    const panelName = inviteData.panelName;
    
    // Obter URL do site
    let siteUrl = window.location.origin;
    if (siteUrl.includes('localhost') || siteUrl.includes('127.0.0.1') || siteUrl.startsWith('file://')) {
        const savedProductionUrl = localStorage.getItem('qualishel-production-url');
        if (savedProductionUrl && savedProductionUrl.trim()) {
            siteUrl = savedProductionUrl.trim();
        } else {
            console.log('ℹ️ URL de produção não configurada. Notificações não serão enviadas.');
            return;
        }
    }
    
    // Preparar mensagem baseada no tipo de atualização
    let updateMessage = '';
    let updateTitle = '';
    
    switch (updateType) {
        case 'new_message':
            updateTitle = 'Nova mensagem no chat';
            updateMessage = `${currentUserName || 'Um colaborador'} enviou uma nova mensagem na demanda "${demand.title}":\n\n"${updateDetails.messageText || ''}"`;
            break;
        case 'new_task':
            updateTitle = 'Nova tarefa adicionada';
            updateMessage = `${currentUserName || 'Um colaborador'} adicionou uma nova tarefa na demanda "${demand.title}":\n\n"${updateDetails.taskText || ''}"`;
            break;
        case 'task_completed':
            updateTitle = 'Tarefa concluída';
            updateMessage = `${currentUserName || 'Um colaborador'} concluiu uma tarefa na demanda "${demand.title}":\n\n"${updateDetails.taskText || ''}"`;
            break;
        case 'status_changed':
            updateTitle = 'Status alterado';
            updateMessage = `O status da demanda "${demand.title}" foi alterado para "${updateDetails.newStatus || demand.status}".`;
            break;
        case 'priority_changed':
            updateTitle = 'Prioridade alterada';
            if (updateDetails.priorityStrategy === 'gut') {
                const gutScoreText = updateDetails.gutScore ? ` (Score GUT ${updateDetails.gutScore})` : '';
                updateMessage = `A prioridade da demanda "${demand.title}" foi recalculada pela Matriz GUT${gutScoreText}, resultando em "${updateDetails.newPriority || demand.priority}".`;
            } else {
            updateMessage = `A prioridade da demanda "${demand.title}" foi alterada para "${updateDetails.newPriority || demand.priority}".`;
            }
            break;
        case 'panel_transferred':
            updateTitle = 'Demanda transferida';
            updateMessage = `A demanda "${demand.title}" foi transferida do painel "${updateDetails.oldPanelName || 'Desconhecido'}" para o painel "${updateDetails.newPanelName || 'Desconhecido'}".`;
            break;
        default:
            updateTitle = 'Atualização na demanda';
            updateMessage = `Houve uma atualização na demanda "${demand.title}".`;
    }
    
    // Enviar e-mail para cada colaborador (exceto o autor da atualização)
    const emailPromises = collaboratorsWithEmail.map(async (collaborator) => {
        // Não notificar o próprio autor da atualização
        if (collaborator.name === currentUserName) {
            return;
        }
        
        try {
            const messageWithLink = `${updateMessage}\n\nPara ver a atualização, clique no link abaixo:\n${accessLink}\n\nOu copie e cole o link no seu navegador:\n${accessLink}`;
            
            const templateParams = {
                to_name: collaborator.name,
                to_email: collaborator.email,
                demand_title: demand.title,
                demand_description: demand.description || 'Sem descrição',
                demand_status: demand.status === 'pendente' ? 'Pendente' : 
                              demand.status === 'andamento' ? 'Em Andamento' : 
                              demand.status === 'revisao' ? 'Em Revisão' : 'Concluído',
                demand_priority: demand.priority === 'baixa' ? 'Baixa' : 
                               demand.priority === 'media' ? 'Média' : 
                               demand.priority === 'alta' ? 'Alta' : 'Urgente',
                demand_responsible: demand.responsible,
                panel_name: panelName,
                from_name: 'Escritório da Qualidade',
                message: messageWithLink,
                access_link: accessLink,
                access_type: 'Apenas este Card',
                site_url: siteUrl,
                link_text: 'Acessar Qualishel',
                link_url: accessLink,
                update_type: updateTitle,
                update_message: updateMessage
            };
            
            // Obter biblioteca EmailJS
            let emailjsLib = null;
            if (typeof emailjs !== 'undefined') {
                emailjsLib = emailjs;
            } else if (typeof window !== 'undefined' && typeof window.emailjs !== 'undefined') {
                emailjsLib = window.emailjs;
            } else {
                console.warn('⚠️ EmailJS não disponível para notificação');
                return;
            }
            
            // Inicializar se necessário
            try {
                emailjsLib.init(emailConfig.publicKey);
            } catch (initError) {
                // Pode já estar inicializado
            }
            
            // Enviar e-mail
            await emailjsLib.send(
                emailConfig.serviceId,
                emailConfig.templateId,
                templateParams
            );
            
            console.log(`✅ Notificação enviada para ${collaborator.email}`);
        } catch (error) {
            console.error(`❌ Erro ao enviar notificação para ${collaborator.email}:`, error);
        }
    });
    
    // Aguardar todos os e-mails serem enviados (sem bloquear a interface)
    Promise.all(emailPromises).then(() => {
        console.log(`📧 Notificações de ${updateType} enviadas para ${collaboratorsWithEmail.length} colaborador(es)`);
    });
}

// ========== TAREFAS E CHAT ==========

window.openTasksChat = function(demandId) {
    currentDemandForTasksChat = demandId;
    const demand = demands.find(d => d.id === demandId);
    if (!demand) return;
    
    if (!demand.tasks) demand.tasks = [];
    if (!demand.chat) demand.chat = [];
    
    document.getElementById('tasks-chat-title').textContent = `Tarefas e Chat - ${demand.title}`;
    renderTasks();
    renderChat();
    switchTab('tasks');
    openTasksChatModal();
};

function openTasksChatModal() {
    tasksChatModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeTasksChatModal() {
    tasksChatModal.classList.remove('active');
    document.body.style.overflow = '';
    currentDemandForTasksChat = null;
}
function switchTab(tabName) {
    // Atualizar botões
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-tab') === tabName) {
            btn.classList.add('active');
        }
    });
    
    // Atualizar conteúdo
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
        if (content.id === `${tabName}-tab`) {
            content.classList.add('active');
        }
    });
}

function renderTasks() {
    if (currentDemandForTasksChat === null) return;
    
    const demand = demands.find(d => d.id === currentDemandForTasksChat);
    if (!demand || !demand.tasks) return;
    
    const tasksList = document.getElementById('tasks-list');
    if (!tasksList) return;
    
    if (demand.tasks.length === 0) {
        tasksList.innerHTML = '<p class="empty-message">Nenhuma tarefa adicionada ainda.</p>';
        updateProgress();
        return;
    }
    
    tasksList.innerHTML = demand.tasks.map((task, index) => {
        const taskClass = task.completed ? 'completed' : '';
        const checked = task.completed ? 'checked' : '';
        return `
            <div class="task-item ${taskClass}">
                <label class="task-checkbox-label">
                    <input type="checkbox" ${checked} onchange="toggleTask(${index})" class="task-checkbox">
                    <span class="task-text">${escapeHtml(task.text)}</span>
                </label>
                <button class="btn-remove-task" onclick="removeTask(${index})" title="Remover">✕</button>
            </div>
        `;
    }).join('');
    
    updateProgress();
}

function updateProgress() {
    if (currentDemandForTasksChat === null) return;
    
    const demand = demands.find(d => d.id === currentDemandForTasksChat);
    if (!demand || !demand.tasks || demand.tasks.length === 0) {
        document.getElementById('progress-percentage').textContent = '0%';
        document.getElementById('progress-fill').style.width = '0%';
        return;
    }
    
    const completedTasks = demand.tasks.filter(t => t.completed).length;
    const totalTasks = demand.tasks.length;
    const progress = Math.round((completedTasks / totalTasks) * 100);
    
    document.getElementById('progress-percentage').textContent = `${progress}%`;
    document.getElementById('progress-fill').style.width = `${progress}%`;
    
    // Atualizar no card também
    renderKanban();
    saveDemands();
}

window.toggleTask = function(index) {
    if (currentDemandForTasksChat === null) return;
    
    const demand = demands.find(d => d.id === currentDemandForTasksChat);
    if (!demand || !demand.tasks) return;
    
    if (demand.tasks[index]) {
        const task = demand.tasks[index];
        const wasCompleted = task.completed;
        task.completed = !task.completed;
        saveDemands();
        renderTasks();
        renderKanban();
        updateCardCounts();
        updateDashboard();
        
        // Notificar colaboradores quando tarefa for concluída (não quando desmarcar)
        if (task.completed && !wasCompleted) {
            notifyCollaboratorsAboutUpdate(demand, 'task_completed', { taskText: task.text });
        }
    }
};

function handleAddTask() {
    const input = document.getElementById('new-task-input');
    const text = input.value.trim();
    
    if (!text) return;
    
    if (currentDemandForTasksChat === null) return;
    
    const demand = demands.find(d => d.id === currentDemandForTasksChat);
    if (!demand) return;
    
    if (!demand.tasks) demand.tasks = [];
    
    demand.tasks.push({
        text: text,
        completed: false,
        createdAt: new Date().toISOString()
    });
    
    saveDemands();
    renderTasks();
    renderKanban();
    updateCardCounts();
    updateDashboard();
    
    // Notificar colaboradores sobre nova tarefa
    notifyCollaboratorsAboutUpdate(demand, 'new_task', { taskText: text });
    
    input.value = '';
}

window.removeTask = function(index) {
    if (currentDemandForTasksChat === null) return;
    
    const demand = demands.find(d => d.id === currentDemandForTasksChat);
    if (!demand || !demand.tasks) return;
    
    demand.tasks.splice(index, 1);
    
    saveDemands();
    renderTasks();
    renderKanban();
    updateCardCounts();
    updateDashboard();
};

function renderChat() {
    if (currentDemandForTasksChat === null) return;
    
    const demand = demands.find(d => d.id === currentDemandForTasksChat);
    if (!demand || !demand.chat) return;
    
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    
    if (demand.chat.length === 0) {
        chatMessages.innerHTML = '<p class="empty-message">Nenhuma mensagem ainda. Seja o primeiro a comentar!</p>';
        return;
    }
    
    chatMessages.innerHTML = demand.chat.map(msg => {
        const date = new Date(msg.timestamp);
        const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const isCurrentUser = msg.author === currentUserName;
        
        return `
            <div class="chat-message ${isCurrentUser ? 'own-message' : ''}">
                <div class="chat-message-header">
                    <span class="chat-author">${escapeHtml(msg.author)}</span>
                    <span class="chat-time">${timeStr}</span>
                </div>
                <div class="chat-message-text">${escapeHtml(msg.text)}</div>
            </div>
        `;
    }).join('');
    
    // Scroll para o final
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function handleSendChat() {
    const input = document.getElementById('chat-message-input');
    const text = input.value.trim();
    
    if (!text) return;
    
    if (currentDemandForTasksChat === null) return;
    
    const demand = demands.find(d => d.id === currentDemandForTasksChat);
    if (!demand) return;
    
    if (!demand.chat) demand.chat = [];
    
    demand.chat.push({
        text: text,
        author: currentUserName,
        timestamp: new Date().toISOString()
    });
    
    saveDemands();
    renderChat();
    
    // Notificar colaboradores sobre nova mensagem
    notifyCollaboratorsAboutUpdate(demand, 'new_message', { messageText: text });
    
    input.value = '';
}

// Utilitário
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Função para converter URLs em links clicáveis
function convertUrlsToLinks(text) {
    if (!text) return '';
    // Primeiro escapa o HTML para segurança
    const escaped = escapeHtml(text);
    // Regex para detectar URLs (http, https, www, etc)
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^\s]*)/g;
    return escaped.replace(urlRegex, (url) => {
        // Garantir que URLs sem protocolo tenham https://
        let href = url;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            href = 'https://' + url;
        }
        return `<a href="${href}" target="_blank" rel="noopener noreferrer" style="color: #60a5fa; text-decoration: underline; transition: color 0.2s;">${url}</a>`;
    });
}

// ========== DASHBOARD ==========

function updateDashboard() {
    // Verificar se a página do dashboard está visível
    const dashboardPage = document.getElementById('dashboard-page');
    if (!dashboardPage || !dashboardPage.classList.contains('active')) {
        return; // Não atualizar se a página não estiver visível
    }
    
    updateMetrics();
    renderCharts();
    renderGanttChart();
    renderUrgentList();
}

function getDashboardDemands() {
    // Obter painel selecionado no dashboard (ou usar o painel atual)
    const dashboardPanelSelector = document.getElementById('dashboard-panel-selector');
    const selectedPanelId = dashboardPanelSelector?.value ? parseInt(dashboardPanelSelector.value) : currentPanelId;
    
    // Obter demandas filtradas por período do dashboard (excluir arquivadas)
    let dashboardDemands = selectedPanelId 
        ? demands.filter(d => d.panelId === selectedPanelId && !d.archived) 
        : demands.filter(d => !d.archived);
    
    // Aplicar filtro de data se houver
    const dateStart = document.getElementById('dashboard-date-start')?.value;
    const dateEnd = document.getElementById('dashboard-date-end')?.value;
    
    if (dateStart || dateEnd) {
        dashboardDemands = dashboardDemands.filter(d => {
            const demandDate = new Date(d.createdAt);
            demandDate.setHours(0, 0, 0, 0);
            
            if (dateStart && dateEnd) {
                const start = new Date(dateStart);
                const end = new Date(dateEnd);
                end.setHours(23, 59, 59, 999);
                return demandDate >= start && demandDate <= end;
            } else if (dateStart) {
                const start = new Date(dateStart);
                return demandDate >= start;
            } else if (dateEnd) {
                const end = new Date(dateEnd);
                end.setHours(23, 59, 59, 999);
                return demandDate <= end;
            }
            return true;
        });
    }
    
    return dashboardDemands;
}

function updateMetrics() {
    const dashboardDemands = getDashboardDemands();
    const total = dashboardDemands.length;
    const pendentes = dashboardDemands.filter(d => d.status === 'pendente').length;
    const andamento = dashboardDemands.filter(d => d.status === 'andamento').length;
    const concluidas = dashboardDemands.filter(d => d.status === 'concluido').length;
    const urgentes = dashboardDemands.filter(d => d.priority === 'urgente').length;
    const taxa = total > 0 ? Math.round((concluidas / total) * 100) : 0;

    // Estatísticas GUT
    const gutDemands = dashboardDemands.filter(d => d.priorityStrategy === 'gut' && d.gut);
    const gutTotal = gutDemands.length;
    const gutScores = gutDemands.map(d => d.gut?.score || 0).filter(s => s > 0);
    const gutAvg = gutScores.length > 0 
        ? Math.round(gutScores.reduce((a, b) => a + b, 0) / gutScores.length)
        : 0;

    // Estatísticas 5W2H
    const w5h2Demands = dashboardDemands.filter(d => d.w5h2 && d.w5h2.enabled);
    const w5h2Total = w5h2Demands.length;
    const w5h2Rate = total > 0 ? Math.round((w5h2Total / total) * 100) : 0;

    document.getElementById('metric-total').textContent = total;
    document.getElementById('metric-pendentes').textContent = pendentes;
    document.getElementById('metric-andamento').textContent = andamento;
    document.getElementById('metric-concluidas').textContent = concluidas;
    document.getElementById('metric-urgentes').textContent = urgentes;
    document.getElementById('metric-taxa').textContent = taxa + '%';
    
    // Atualizar métricas GUT
    const metricGutTotal = document.getElementById('metric-gut-total');
    const metricGutAvg = document.getElementById('metric-gut-avg');
    if (metricGutTotal) metricGutTotal.textContent = gutTotal;
    if (metricGutAvg) metricGutAvg.textContent = gutAvg > 0 ? gutAvg : '-';
    
    // Atualizar métricas 5W2H
    const metricW5H2Total = document.getElementById('metric-w5h2-total');
    const metricW5H2Rate = document.getElementById('metric-w5h2-rate');
    if (metricW5H2Total) metricW5H2Total.textContent = w5h2Total;
    if (metricW5H2Rate) metricW5H2Rate.textContent = w5h2Rate + '%';
}

function renderCharts() {
    renderStatusChart();
    renderPriorityChart();
    renderResponsibleChart();
    renderTimelineChart();
}

function renderStatusChart() {
    const canvas = document.getElementById('status-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const statuses = ['pendente', 'andamento', 'revisao', 'concluido'];
    const labels = ['Pendente', 'Em Andamento', 'Em Revisão', 'Concluído'];
    const colors = ['#f59e0b', '#2563eb', '#8b5cf6', '#10b981'];
    
    const dashboardDemands = getDashboardDemands();
    const data = statuses.map(s => dashboardDemands.filter(d => d.status === s).length);
    
    // Limpar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Calcular dimensões
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) / 3;
    
    let currentAngle = -Math.PI / 2;
    const total = data.reduce((a, b) => a + b, 0);
    
    if (total === 0) {
        ctx.fillStyle = '#64748b';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Sem dados', centerX, centerY);
        return;
    }
    
    // Desenhar pizza
    data.forEach((value, index) => {
        if (value === 0) return;
        
        const sliceAngle = (value / total) * 2 * Math.PI;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
        ctx.closePath();
        ctx.fillStyle = colors[index];
        ctx.fill();
        
        // Legenda com fundo para melhor visibilidade
        const labelAngle = currentAngle + sliceAngle / 2;
        const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7);
        const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7);
        
        // Desenhar número branco sem fundo
        ctx.fillStyle = '#ffffff';
        ctx.font = '600 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Adicionar sombra sutil para melhor legibilidade
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 2;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 1;
        ctx.fillText(value.toString(), labelX, labelY);
        // Resetar sombra
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        
        currentAngle += sliceAngle;
    });
    
    // Legenda externa elegante
    const legendY = centerY + radius + 35;
    labels.forEach((label, index) => {
        const x = (canvas.width / labels.length) * (index + 0.5);
        const legendX = x - 45;
        
        // Quadrado da legenda com bordas arredondadas
        ctx.fillStyle = colors[index];
        const rectX = legendX;
        const rectY = legendY - 10;
        const rectW = 18;
        const rectH = 18;
        const rectR = 4;
        ctx.beginPath();
        ctx.moveTo(rectX + rectR, rectY);
        ctx.lineTo(rectX + rectW - rectR, rectY);
        ctx.quadraticCurveTo(rectX + rectW, rectY, rectX + rectW, rectY + rectR);
        ctx.lineTo(rectX + rectW, rectY + rectH - rectR);
        ctx.quadraticCurveTo(rectX + rectW, rectY + rectH, rectX + rectW - rectR, rectY + rectH);
        ctx.lineTo(rectX + rectR, rectY + rectH);
        ctx.quadraticCurveTo(rectX, rectY + rectH, rectX, rectY + rectH - rectR);
        ctx.lineTo(rectX, rectY + rectR);
        ctx.quadraticCurveTo(rectX, rectY, rectX + rectR, rectY);
        ctx.closePath();
        ctx.fill();
        
        // Texto harmonizado
        ctx.fillStyle = '#1e40af';
        ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(label, legendX + 24, legendY + 2);
    });
}

function renderPriorityChart() {
    const canvas = document.getElementById('priority-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const priorities = ['baixa', 'media', 'alta', 'urgente'];
    const labels = ['Baixa', 'Média', 'Alta', 'Urgente'];
    // Cores distintas e vibrantes para cada barra
    const colors = ['#10b981', '#fbbf24', '#f59e0b', '#ef4444'];
    
    const dashboardDemands = getDashboardDemands();
    const data = priorities.map(p => dashboardDemands.filter(d => d.priority === p).length);
    const max = Math.max(...data, 1);
    
    // Limpar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const barWidth = (canvas.width - 100) / priorities.length;
    const barHeight = canvas.height - 80;
    const startX = 50;
    const startY = canvas.height - 30;
    
    data.forEach((value, index) => {
        const x = startX + index * barWidth + 20;
        const height = (value / max) * barHeight;
        const y = startY - height;
        
        // Barra
        ctx.fillStyle = colors[index];
        ctx.fillRect(x, y, barWidth - 40, height);
        
        // Número branco sem fundo
        const valueX = x + (barWidth - 40) / 2;
        const valueY = y - 8;
        const valueText = value.toString();
        
        // Desenhar número preto sem fundo
        ctx.fillStyle = '#1e293b';
        ctx.font = '600 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(valueText, valueX, valueY);
        
        // Label em preto
        ctx.fillStyle = '#1e293b';
        ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(labels[index], valueX, startY + 22);
    });
}

function renderResponsibleChart() {
    const container = document.getElementById('responsible-chart');
    if (!container) return;
    
    const dashboardDemands = getDashboardDemands();
    const responsibleCounts = {};
    dashboardDemands.forEach(d => {
        const resp = d.responsible || 'Não atribuído';
        responsibleCounts[resp] = (responsibleCounts[resp] || 0) + 1;
    });
    
    const sorted = Object.entries(responsibleCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    const max = Math.max(...sorted.map(s => s[1]), 1);
    
    container.innerHTML = sorted.map(([name, count]) => {
        const percentage = (count / max) * 100;
        return `
            <div class="bar-item">
                <div class="bar-label">${escapeHtml(name)}</div>
                <div class="bar-container">
                    <div class="bar-fill" style="width: ${percentage}%">${count}</div>
                </div>
            </div>
        `;
    }).join('');
    
    if (sorted.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>Sem dados</p></div>';
    }
}

function renderTimelineChart() {
    const canvas = document.getElementById('timeline-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Agrupar por data de criação
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        last7Days.push(date);
    }
    
    const dashboardDemands = getDashboardDemands();
    const data = last7Days.map(date => {
        return dashboardDemands.filter(d => {
            const dDate = new Date(d.createdAt);
            dDate.setHours(0, 0, 0, 0);
            return dDate.getTime() === date.getTime();
        }).length;
    });
    
    const max = Math.max(...data, 1);
    const barWidth = (canvas.width - 100) / 7;
    const barHeight = canvas.height - 80;
    const startX = 50;
    const startY = canvas.height - 30;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    data.forEach((value, index) => {
        const x = startX + index * barWidth + 10;
        const height = (value / max) * barHeight;
        const y = startY - height;
        
        // Barra
        ctx.fillStyle = '#2563eb';
        ctx.fillRect(x, y, barWidth - 20, height);
        
        // Número preto sem fundo
        const valueX = x + (barWidth - 20) / 2;
        const valueY = y - 8;
        const valueText = value.toString();
        
        // Desenhar número preto sem fundo
        ctx.fillStyle = '#1e293b';
        ctx.font = '600 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(valueText, valueX, valueY);
        
        // Data em preto
        const day = last7Days[index].getDate();
        const month = last7Days[index].getMonth() + 1;
        ctx.fillStyle = '#1e293b';
        ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${day}/${month}`, valueX, startY + 22);
    });
}
function renderGanttChart() {
    const canvas = document.getElementById('gantt-chart');
    if (!canvas) return;
    
    // Ajustar tamanho do canvas para ser responsivo
    const container = canvas.parentElement;
    if (!container) return;
    
    const containerWidth = container.clientWidth - 48; // Padding ajustado
    const minWidth = 1000;
    const canvasWidth = Math.max(containerWidth, minWidth);
    
    // Calcular altura dinâmica baseada no número de demandas
    const dashboardDemands = getDashboardDemands();
    const ganttDemandsCount = dashboardDemands.filter(d =>
        (d.status === 'andamento' || d.status === 'revisao' || d.status === 'concluido') && d.deadline
    ).length;
    
    const baseHeight = 120; // Altura base (título + margens)
    const rowHeight = 42;
    const rowSpacing = 16;
    const minRows = 3; // Mínimo de 3 linhas visíveis
    const rows = Math.max(ganttDemandsCount, minRows);
    const calculatedHeight = baseHeight + (rows * (rowHeight + rowSpacing)) + rowSpacing;
    const canvasHeight = Math.max(calculatedHeight, 500); // Altura mínima de 500px
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    const ctx = canvas.getContext('2d');
    
    // Filtrar demandas que têm prazo ou estão em andamento/revisão/concluído
    // (dashboardDemands já foi declarado acima)
    const ganttDemands = dashboardDemands.filter(d =>
        (d.status === 'andamento' || d.status === 'revisao' || d.status === 'concluido') && d.deadline
    );
    
    if (ganttDemands.length === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#64748b';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Nenhuma demanda com prazo definido', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    // Ordenar por data de criação
    ganttDemands.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    
    // Calcular período do gráfico (últimos 30 dias ou do início da primeira demanda até hoje + 7 dias)
    const now = new Date();
    const startDates = ganttDemands.map(d => new Date(d.createdAt));
    const endDates = ganttDemands.map(d => d.deadline ? new Date(d.deadline) : now);
    
    const minDate = new Date(Math.min(...startDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...endDates.map(d => d.getTime()), now.getTime()));
    
    // Adicionar margem de 7 dias no futuro
    maxDate.setDate(maxDate.getDate() + 7);
    
    // Ajustar para começar no início da semana
    const daysFromMonday = minDate.getDay() === 0 ? 6 : minDate.getDay() - 1;
    minDate.setDate(minDate.getDate() - daysFromMonday);
    
    const totalDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));
    
    // Configurações melhoradas
    const padding = 50;
    const labelWidth = 240;
    const chartWidth = canvas.width - labelWidth - padding * 2;
    // rowHeight e rowSpacing já foram declarados acima
    const chartHeight = ganttDemands.length * (rowHeight + rowSpacing) + rowSpacing;
    const startY = 80;
    
    // Limpar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Desenhar fundo harmonizado
    const bgGradient = ctx.createLinearGradient(labelWidth + padding, startY, labelWidth + padding, startY + chartHeight);
    bgGradient.addColorStop(0, 'rgba(239, 246, 255, 0.6)');
    bgGradient.addColorStop(1, 'rgba(219, 234, 254, 0.4)');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(labelWidth + padding, startY, chartWidth, chartHeight);
    
    // Desenhar grade de semanas elegante
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
    ctx.lineWidth = 1;
    
    let currentDate = new Date(minDate);
    const dayWidth = chartWidth / totalDays;
    
    while (currentDate <= maxDate) {
        const daysDiff = Math.floor((currentDate - minDate) / (1000 * 60 * 60 * 24));
        const x = labelWidth + padding + (daysDiff * dayWidth);
        
        // Linha vertical
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x, startY + chartHeight);
        ctx.stroke();
        
            // Label do dia elegante
        if (daysDiff % 7 === 0 || daysDiff === 0) {
            const dateStr = currentDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            const textX = x;
            const textY = startY - 12;
            
            // Fundo suave para a data
            ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            const textWidth = ctx.measureText(dateStr).width;
            const padding = 6;
            
            // Fundo com gradiente muito sutil
            const bgGradient = ctx.createLinearGradient(textX - textWidth/2 - padding, textY - 8, textX - textWidth/2 - padding, textY + 2);
            bgGradient.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
            bgGradient.addColorStop(1, 'rgba(239, 246, 255, 0.3)');
            ctx.fillStyle = bgGradient;
            
            // Retângulo arredondado
            const bgX = textX - textWidth/2 - padding;
            const bgY = textY - 10;
            const bgW = textWidth + padding * 2;
            const bgH = 16;
            const bgR = 8;
            
            ctx.beginPath();
            ctx.moveTo(bgX + bgR, bgY);
            ctx.lineTo(bgX + bgW - bgR, bgY);
            ctx.quadraticCurveTo(bgX + bgW, bgY, bgX + bgW, bgY + bgR);
            ctx.lineTo(bgX + bgW, bgY + bgH - bgR);
            ctx.quadraticCurveTo(bgX + bgW, bgY + bgH, bgX + bgW - bgR, bgY + bgH);
            ctx.lineTo(bgX + bgR, bgY + bgH);
            ctx.quadraticCurveTo(bgX, bgY + bgH, bgX, bgY + bgH - bgR);
            ctx.lineTo(bgX, bgY + bgR);
            ctx.quadraticCurveTo(bgX, bgY, bgX + bgR, bgY);
            ctx.closePath();
            ctx.fill();
            
            // Texto da data suave
            ctx.fillStyle = '#475569';
            ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(dateStr, textX, textY - 2);
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Linha de hoje
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (today >= minDate && today <= maxDate) {
        const daysDiff = Math.floor((today - minDate) / (1000 * 60 * 60 * 24));
        const x = labelWidth + padding + (daysDiff * dayWidth);
        
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x, startY - 20);
        ctx.lineTo(x, startY + chartHeight);
        ctx.stroke();
        
        // Label "Hoje" elegante
        const hojeText = 'Hoje';
        ctx.font = '700 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const hojeTextWidth = ctx.measureText(hojeText).width;
        const hojePadding = 10;
        const hojeX = x;
        const hojeY = startY - 32;
        
        // Fundo vermelho suave
        const hojeBgGradient = ctx.createLinearGradient(hojeX - hojeTextWidth/2 - hojePadding, hojeY - 8, hojeX - hojeTextWidth/2 - hojePadding, hojeY + 2);
        hojeBgGradient.addColorStop(0, 'rgba(239, 68, 68, 0.7)');
        hojeBgGradient.addColorStop(1, 'rgba(220, 38, 38, 0.6)');
        ctx.fillStyle = hojeBgGradient;
        
        // Retângulo arredondado
        const hojeBgX = hojeX - hojeTextWidth/2 - hojePadding;
        const hojeBgY = hojeY - 10;
        const hojeBgW = hojeTextWidth + hojePadding * 2;
        const hojeBgH = 18;
        const hojeBgR = 9;
        
        ctx.beginPath();
        ctx.moveTo(hojeBgX + hojeBgR, hojeBgY);
        ctx.lineTo(hojeBgX + hojeBgW - hojeBgR, hojeBgY);
        ctx.quadraticCurveTo(hojeBgX + hojeBgW, hojeBgY, hojeBgX + hojeBgW, hojeBgY + hojeBgR);
        ctx.lineTo(hojeBgX + hojeBgW, hojeBgY + hojeBgH - hojeBgR);
        ctx.quadraticCurveTo(hojeBgX + hojeBgW, hojeBgY + hojeBgH, hojeBgX + hojeBgW - hojeBgR, hojeBgY + hojeBgH);
        ctx.lineTo(hojeBgX + hojeBgR, hojeBgY + hojeBgH);
        ctx.quadraticCurveTo(hojeBgX, hojeBgY + hojeBgH, hojeBgX, hojeBgY + hojeBgH - hojeBgR);
        ctx.lineTo(hojeBgX, hojeBgY + hojeBgR);
        ctx.quadraticCurveTo(hojeBgX, hojeBgY, hojeBgX + hojeBgR, hojeBgY);
        ctx.closePath();
        ctx.fill();
        
        // Texto "Hoje" suave
        ctx.fillStyle = '#ffffff';
        ctx.font = '700 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(hojeText, hojeX, hojeY - 1);
    }
    
    // Desenhar barras de Gantt
    ganttDemands.forEach((demand, index) => {
        const y = startY + index * (rowHeight + rowSpacing);
        
        // Label da demanda elegante com fundo
        const title = demand.title.length > 32 ? demand.title.substring(0, 29) + '...' : demand.title;
        const labelX = 20;
        const labelY = y + rowHeight / 2;
        
        // Fundo sutil para o label
        ctx.font = '600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const textWidth = ctx.measureText(title).width;
        const labelPadding = 8;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        const labelBgX = labelX - labelPadding;
        const labelBgY = labelY - 10;
        const labelBgW = textWidth + labelPadding * 2;
        const labelBgH = 20;
        const labelBgR = 6;
        
        ctx.beginPath();
        ctx.moveTo(labelBgX + labelBgR, labelBgY);
        ctx.lineTo(labelBgX + labelBgW - labelBgR, labelBgY);
        ctx.quadraticCurveTo(labelBgX + labelBgW, labelBgY, labelBgX + labelBgW, labelBgY + labelBgR);
        ctx.lineTo(labelBgX + labelBgW, labelBgY + labelBgH - labelBgR);
        ctx.quadraticCurveTo(labelBgX + labelBgW, labelBgY + labelBgH, labelBgX + labelBgW - labelBgR, labelBgY + labelBgH);
        ctx.lineTo(labelBgX + labelBgR, labelBgY + labelBgH);
        ctx.quadraticCurveTo(labelBgX, labelBgY + labelBgH, labelBgX, labelBgY + labelBgH - labelBgR);
        ctx.lineTo(labelBgX, labelBgY + labelBgR);
        ctx.quadraticCurveTo(labelBgX, labelBgY, labelBgX + labelBgR, labelBgY);
        ctx.closePath();
        ctx.fill();
        
        // Texto do label
        ctx.fillStyle = '#1e293b';
        ctx.font = '600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(title, labelX, labelY);
        
        // Calcular posição da barra
        const startDate = new Date(demand.createdAt);
        const endDate = demand.deadline ? new Date(demand.deadline) : now;
        
        const startDays = Math.floor((startDate - minDate) / (1000 * 60 * 60 * 24));
        const endDays = Math.floor((endDate - minDate) / (1000 * 60 * 60 * 24));
        
        const barX = labelWidth + padding + (startDays * dayWidth);
        const barWidth = (endDays - startDays) * dayWidth;
        
        // Cor baseada no status - usando paleta harmonizada
        let color = '#4169E1'; // Azul Royal (em andamento)
        if (demand.status === 'revisao') {
            color = '#8b5cf6'; // Roxo
        } else if (demand.status === 'concluido') {
            color = '#10b981'; // Verde esmeralda
        }
        
        // Verificar se está vencido
        const isOverdue = endDate < now && demand.status !== 'concluido';
        if (isOverdue) {
            color = '#ef4444'; // Vermelho
        }
        
        // Desenhar barra com gradiente elegante
        const barGradient = ctx.createLinearGradient(barX, y, barX, y + rowHeight);
        barGradient.addColorStop(0, color);
        barGradient.addColorStop(1, isOverdue ? '#dc2626' : (demand.status === 'concluido' ? '#059669' : (demand.status === 'revisao' ? '#7c3aed' : '#2563eb')));
        ctx.fillStyle = barGradient;
        
        // Desenhar barra com bordas arredondadas
        const barRadius = 8;
        ctx.beginPath();
        ctx.moveTo(barX + barRadius, y);
        ctx.lineTo(barX + barWidth - barRadius, y);
        ctx.quadraticCurveTo(barX + barWidth, y, barX + barWidth, y + barRadius);
        ctx.lineTo(barX + barWidth, y + rowHeight - barRadius);
        ctx.quadraticCurveTo(barX + barWidth, y + rowHeight, barX + barWidth - barRadius, y + rowHeight);
        ctx.lineTo(barX + barRadius, y + rowHeight);
        ctx.quadraticCurveTo(barX, y + rowHeight, barX, y + rowHeight - barRadius);
        ctx.lineTo(barX, y + barRadius);
        ctx.quadraticCurveTo(barX, y, barX + barRadius, y);
        ctx.closePath();
        ctx.fill();
        
        // Borda sutil da barra
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Indicador de início (bolinha elegante)
        ctx.beginPath();
        ctx.arc(barX, y + rowHeight / 2, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Indicador de fim (bolinha elegante)
        ctx.beginPath();
        ctx.arc(barX + barWidth, y + rowHeight / 2, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Texto na barra elegante (se houver espaço)
        if (barWidth > 100) {
            const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
            const daysText = `${days} dia${days !== 1 ? 's' : ''}`;
            const textX = barX + barWidth / 2;
            const textY = y + rowHeight / 2;
            
            // Texto branco elegante com sombra sutil
            ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
            ctx.shadowBlur = 3;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 1;
            ctx.fillStyle = '#ffffff';
            ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(daysText, textX, textY);
            // Resetar sombra
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
        }
    });
    
    // Título elegante centralizado
    ctx.fillStyle = '#1e40af';
    ctx.font = '700 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Gráfico de Gantt - Cronograma de Demandas', canvas.width / 2, 15);
}

function renderUrgentList() {
    const container = document.getElementById('urgent-list');
    if (!container) return;
    
    const dashboardDemands = getDashboardDemands();
    const urgentDemands = dashboardDemands
        .filter(d => d.priority === 'urgente')
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    
    if (urgentDemands.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>Nenhuma demanda urgente</p></div>';
        return;
    }
    
    container.innerHTML = urgentDemands.map(demand => {
        const date = new Date(demand.createdAt);
        const daysOpen = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
        
        return `
            <div class="urgent-item">
                <div class="urgent-item-info">
                    <div class="urgent-item-title">${escapeHtml(demand.title)}</div>
                    <div class="urgent-item-meta">
                        ${escapeHtml(demand.responsible)} • ${daysOpen} dia(s) aberto
                    </div>
                </div>
                <span class="status-badge status-${demand.status}">
                    ${demand.status === 'pendente' ? 'Pendente' : 
                      demand.status === 'andamento' ? 'Em Andamento' : 
                      demand.status === 'revisao' ? 'Em Revisão' : 'Concluído'}
                </span>
            </div>
        `;
    }).join('');
}

// ========== RELATÓRIOS ==========

let filteredDemands = [];

async function updateReports() {
    // Recarregar dados e aguardar
    await loadDemands();
    populateResponsibleFilter();
    // Aguardar um pouco para garantir que os dados foram processados
    setTimeout(() => {
        applyFilters();
    }, 100);
}

function populateResponsibleFilter() {
    const select = document.getElementById('filter-responsible');
    if (!select) return;
    
    // Filtrar apenas demandas não arquivadas para o seletor de responsáveis
    const responsibles = [...new Set(demands.filter(d => !d.archived).map(d => d.responsible || 'Não atribuído'))];
    
    select.innerHTML = '<option value="all">Todos</option>' +
        responsibles.map(r => `<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`).join('');
}

function applyFilters() {
    // Obter modo de seleção de painéis
    const selectionMode = document.querySelector('input[name="panel-selection-mode"]:checked')?.value || 'all';
    let selectedPanelIds = [];
    
    if (selectionMode === 'all') {
        // Todos os painéis - não filtrar
        selectedPanelIds = null;
    } else if (selectionMode === 'single') {
        // Painel único
        const reportPanelSelector = document.getElementById('report-panel-selector');
        const selectedPanelId = reportPanelSelector?.value ? parseInt(reportPanelSelector.value) : null;
        if (selectedPanelId) {
            selectedPanelIds = [selectedPanelId];
        } else {
            // Se nenhum painel selecionado no modo single, usar todos
            selectedPanelIds = null;
        }
    } else if (selectionMode === 'multiple') {
        // Múltiplos painéis
        const checkboxes = document.querySelectorAll('#panel-checkboxes input[type="checkbox"]:checked');
        selectedPanelIds = Array.from(checkboxes).map(cb => parseInt(cb.value));
        // Se nenhum checkbox marcado, usar todos
        if (selectedPanelIds.length === 0) {
            selectedPanelIds = null;
        }
    }
    
    // Filtrar por painéis selecionados - ATUALIZAR VARIÁVEL GLOBAL
    // Se selectedPanelIds é null, mostrar todas as demandas (excluir arquivadas)
    filteredDemands = selectedPanelIds === null 
        ? demands.filter(d => !d.archived) // Criar cópia do array excluindo arquivadas
        : demands.filter(d => d.panelId && selectedPanelIds.includes(d.panelId) && !d.archived);
    
    // Filtro de status
    const statusFilter = document.getElementById('filter-status')?.value;
    if (statusFilter && statusFilter !== 'all') {
        filteredDemands = filteredDemands.filter(d => d.status === statusFilter);
    }
    
    // Filtro de prioridade
    const priorityFilter = document.getElementById('filter-priority')?.value;
    if (priorityFilter && priorityFilter !== 'all') {
        filteredDemands = filteredDemands.filter(d => d.priority === priorityFilter);
    }
    
    // Filtro de responsável
    const responsibleFilter = document.getElementById('filter-responsible')?.value;
    if (responsibleFilter && responsibleFilter !== 'all') {
        filteredDemands = filteredDemands.filter(d => d.responsible === responsibleFilter);
    }
    
    // Filtro de data (período personalizado)
    const dateStart = document.getElementById('filter-date-start')?.value;
    const dateEnd = document.getElementById('filter-date-end')?.value;
    
    if (dateStart || dateEnd) {
        filteredDemands = filteredDemands.filter(d => {
            const demandDate = new Date(d.createdAt);
            demandDate.setHours(0, 0, 0, 0);
            
            if (dateStart && dateEnd) {
                const start = new Date(dateStart);
                const end = new Date(dateEnd);
                end.setHours(23, 59, 59, 999);
                return demandDate >= start && demandDate <= end;
            } else if (dateStart) {
                const start = new Date(dateStart);
                return demandDate >= start;
            } else if (dateEnd) {
                const end = new Date(dateEnd);
                end.setHours(23, 59, 59, 999);
                return demandDate <= end;
            }
            return true;
        });
    }
    
    console.log('📊 Relatório: Demandas filtradas:', filteredDemands.length);
    console.log('📊 Total de demandas:', demands.length);
    
    updateReportSummary();
    updateReportTable();
    renderReportCharts();
}

// Funções auxiliares para estatísticas descritivas
function calculateMean(numbers) {
    if (numbers.length === 0) return null;
    const sum = numbers.reduce((a, b) => a + b, 0);
    return sum / numbers.length;
}

function calculateMedian(numbers) {
    if (numbers.length === 0) return null;
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 
        ? (sorted[mid - 1] + sorted[mid]) / 2 
        : sorted[mid];
}

function calculateStandardDeviation(numbers) {
    if (numbers.length === 0) return null;
    const mean = calculateMean(numbers);
    const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
    const avgSquaredDiff = calculateMean(squaredDiffs);
    return Math.sqrt(avgSquaredDiff);
}

function calculateQuartile(numbers, quartile) {
    if (numbers.length === 0) return null;
    const sorted = [...numbers].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * quartile);
    return sorted[index];
}

function calculateMin(numbers) {
    return numbers.length > 0 ? Math.min(...numbers) : null;
}

function calculateMax(numbers) {
    return numbers.length > 0 ? Math.max(...numbers) : null;
}

function formatNumber(value, decimals = 1) {
    if (value === null || value === undefined || isNaN(value)) return '-';
    return value.toFixed(decimals);
}

function formatDays(value) {
    if (value === null || value === undefined || isNaN(value)) return '-';
    return Math.round(value) + ' dia(s)';
}

function updateReportSummary() {
    // Atualizar informações do período
    const dateStart = document.getElementById('filter-date-start')?.value;
    const dateEnd = document.getElementById('filter-date-end')?.value;
    const periodInfo = document.getElementById('report-period-info');
    const generationDate = document.getElementById('report-generation-date');
    
    if (periodInfo) {
        if (dateStart && dateEnd) {
            const startFormatted = new Date(dateStart).toLocaleDateString('pt-BR');
            const endFormatted = new Date(dateEnd).toLocaleDateString('pt-BR');
            periodInfo.textContent = `Período: ${startFormatted} a ${endFormatted}`;
            periodInfo.style.display = 'block';
        } else if (dateStart) {
            const startFormatted = new Date(dateStart).toLocaleDateString('pt-BR');
            periodInfo.textContent = `Período: A partir de ${startFormatted}`;
            periodInfo.style.display = 'block';
        } else if (dateEnd) {
            const endFormatted = new Date(dateEnd).toLocaleDateString('pt-BR');
            periodInfo.textContent = `Período: Até ${endFormatted}`;
            periodInfo.style.display = 'block';
        } else {
            periodInfo.textContent = 'Período: Todo o período';
            periodInfo.style.display = 'block';
        }
    }
    
    if (generationDate) {
        const now = new Date();
        const dateStr = now.toLocaleDateString('pt-BR');
        const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        generationDate.textContent = `Gerado em: ${dateStr} às ${timeStr}`;
    }
    
    // ========== ESTATÍSTICAS BÁSICAS ==========
    const total = filteredDemands.length;
    const concluidas = filteredDemands.filter(d => d.status === 'concluido').length;
    const emAndamento = filteredDemands.filter(d => d.status === 'andamento').length;
    const pendentes = filteredDemands.filter(d => d.status === 'pendente').length;
    const taxa = total > 0 ? Math.round((concluidas / total) * 100) : 0;
    
    // ========== ESTATÍSTICAS DE TEMPO ==========
    const now = Date.now();
    const timesOpen = filteredDemands.map(d => {
        const created = new Date(d.createdAt).getTime();
        return Math.floor((now - created) / (1000 * 60 * 60 * 24)); // dias
    });
    
    // Tempos de resolução (apenas para demandas concluídas)
    const resolutionTimes = filteredDemands
        .filter(d => d.status === 'concluido' && d.updatedAt)
        .map(d => {
            const created = new Date(d.createdAt).getTime();
            const updated = new Date(d.updatedAt).getTime();
            return Math.floor((updated - created) / (1000 * 60 * 60 * 24)); // dias
        });
    
    // Calcular estatísticas descritivas de tempo aberto
    const avgTime = calculateMean(timesOpen);
    const medianTime = calculateMedian(timesOpen);
    const stdDev = calculateStandardDeviation(timesOpen);
    const minTime = calculateMin(timesOpen);
    const maxTime = calculateMax(timesOpen);
    const q1 = calculateQuartile(timesOpen, 0.25);
    const q3 = calculateQuartile(timesOpen, 0.75);
    const range = maxTime !== null && minTime !== null ? maxTime - minTime : null;
    
    // Tempo médio de resolução
    const avgResolution = calculateMean(resolutionTimes);
    
    // ========== ESTATÍSTICAS DE DATA ==========
    let oldest = '-';
    let newest = '-';
    if (filteredDemands.length > 0) {
        const oldestDemand = filteredDemands.reduce((oldest, current) => {
            return new Date(current.createdAt) < new Date(oldest.createdAt) ? current : oldest;
        });
        const newestDemand = filteredDemands.reduce((newest, current) => {
            return new Date(current.createdAt) > new Date(newest.createdAt) ? current : newest;
        });
        oldest = new Date(oldestDemand.createdAt).toLocaleDateString('pt-BR');
        newest = new Date(newestDemand.createdAt).toLocaleDateString('pt-BR');
    }
    
    // ========== TAXA DE CONCLUSÃO ÚLTIMOS 30 DIAS ==========
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentDemands = filteredDemands.filter(d => {
        const created = new Date(d.createdAt);
        return created >= thirtyDaysAgo;
    });
    const recentCompleted = recentDemands.filter(d => d.status === 'concluido').length;
    const completion30d = recentDemands.length > 0 
        ? Math.round((recentCompleted / recentDemands.length) * 100) 
        : 0;
    
    // ========== DISTRIBUIÇÃO POR PRIORIDADE ==========
    const priorityUrgent = filteredDemands.filter(d => d.priority === 'urgente').length;
    const priorityHigh = filteredDemands.filter(d => d.priority === 'alta').length;
    const priorityMedium = filteredDemands.filter(d => d.priority === 'media').length;
    const priorityLow = filteredDemands.filter(d => d.priority === 'baixa').length;
    
    // ========== ESTATÍSTICAS MATRIZ GUT ==========
    const gutDemands = filteredDemands.filter(d => d.priorityStrategy === 'gut' && d.gut);
    const gutTotal = gutDemands.length;
    const gutScores = gutDemands.map(d => d.gut?.score || 0).filter(s => s > 0);
    const gutAvg = gutScores.length > 0 
        ? Math.round(gutScores.reduce((a, b) => a + b, 0) / gutScores.length)
        : null;
    const gutMax = gutScores.length > 0 ? Math.max(...gutScores) : null;
    const gutMin = gutScores.length > 0 ? Math.min(...gutScores) : null;
    const gutRate = total > 0 ? Math.round((gutTotal / total) * 100) : 0;
    const gutUrgent = gutDemands.filter(d => d.priority === 'urgente').length;
    
    // ========== ESTATÍSTICAS 5W2H ==========
    const w5h2Demands = filteredDemands.filter(d => d.w5h2 && d.w5h2.enabled);
    const w5h2Total = w5h2Demands.length;
    const w5h2Rate = total > 0 ? Math.round((w5h2Total / total) * 100) : 0;
    
    // Contar demandas com 5W2H completo (todos os 7 campos preenchidos)
    const w5h2Complete = w5h2Demands.filter(d => {
        const w5h2 = d.w5h2;
        return w5h2.what && w5h2.who && w5h2.when && w5h2.where && 
               w5h2.why && w5h2.how && w5h2.howMuch;
    }).length;
    const w5h2Partial = w5h2Total - w5h2Complete;
    
    // ========== ATUALIZAR ELEMENTOS DO DOM ==========
    // Função auxiliar para atualizar elemento de forma segura
    const updateElement = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    };
    
    // Estatísticas Básicas
    updateElement('report-total', total);
    updateElement('report-completion', taxa + '%');
    updateElement('report-in-progress', emAndamento);
    updateElement('report-pending', pendentes);
    
    // Estatísticas de Tempo
    updateElement('report-avg-time', formatDays(avgTime));
    updateElement('report-median-time', formatDays(medianTime));
    updateElement('report-std-dev', formatDays(stdDev));
    updateElement('report-min-time', formatDays(minTime));
    updateElement('report-max-time', formatDays(maxTime));
    updateElement('report-q1', formatDays(q1));
    updateElement('report-q3', formatDays(q3));
    updateElement('report-range', formatDays(range));
    
    // Distribuição e Tendências
    updateElement('report-oldest', oldest);
    updateElement('report-newest', newest);
    updateElement('report-avg-resolution', formatDays(avgResolution));
    updateElement('report-completion-30d', completion30d + '%');
    
    // Distribuição por Prioridade
    updateElement('report-priority-urgent', priorityUrgent);
    updateElement('report-priority-high', priorityHigh);
    updateElement('report-priority-medium', priorityMedium);
    updateElement('report-priority-low', priorityLow);
    
    // Estatísticas GUT
    updateElement('report-gut-total', gutTotal);
    updateElement('report-gut-avg', gutAvg !== null ? gutAvg : '-');
    updateElement('report-gut-max', gutMax !== null ? gutMax : '-');
    updateElement('report-gut-min', gutMin !== null ? gutMin : '-');
    updateElement('report-gut-rate', gutRate + '%');
    updateElement('report-gut-urgent', gutUrgent);
    
    // Estatísticas 5W2H
    updateElement('report-w5h2-total', w5h2Total);
    updateElement('report-w5h2-rate', w5h2Rate + '%');
    updateElement('report-w5h2-complete', w5h2Complete);
    updateElement('report-w5h2-partial', w5h2Partial);
}

function updateReportTable() {
    const tbody = document.getElementById('report-table-body');
    if (!tbody) return;
    
    if (filteredDemands.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 2rem;">Nenhuma demanda encontrada</td></tr>';
        return;
    }
    
    tbody.innerHTML = filteredDemands.map(demand => {
        const date = new Date(demand.createdAt);
        const daysOpen = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
        const formattedDate = date.toLocaleDateString('pt-BR');
        
        const statusLabels = {
            'pendente': 'Pendente',
            'andamento': 'Em Andamento',
            'revisao': 'Em Revisão',
            'concluido': 'Concluído'
        };
        
        const priorityLabels = {
            'baixa': 'Baixa',
            'media': 'Média',
            'alta': 'Alta',
            'urgente': 'Urgente'
        };
        
        // Verificar se usa GUT
        const usesGut = demand.priorityStrategy === 'gut' && demand.gut;
        const gutBadge = usesGut 
            ? `<span class="tool-badge tool-badge-gut" title="Score GUT: ${demand.gut.score}">🧭 ${demand.gut.score}</span>`
            : '<span class="tool-badge tool-badge-none">-</span>';
        
        // Verificar se usa 5W2H
        const usesW5H2 = demand.w5h2 && demand.w5h2.enabled;
        const w5h2Badge = usesW5H2 
            ? `<span class="tool-badge tool-badge-w5h2" title="Análise 5W2H ativa">📊</span>`
            : '<span class="tool-badge tool-badge-none">-</span>';
        
        return `
            <tr>
                <td>#${demand.id}</td>
                <td>${escapeHtml(demand.title)}</td>
                <td><span class="status-badge status-${demand.status}">${statusLabels[demand.status]}</span></td>
                <td><span class="card-priority priority-${demand.priority}">${priorityLabels[demand.priority]}</span></td>
                <td>${gutBadge}</td>
                <td>${w5h2Badge}</td>
                <td>${escapeHtml(demand.responsible)}</td>
                <td>${formattedDate}</td>
                <td>${daysOpen} dia(s)</td>
            </tr>
        `;
    }).join('');
}

function renderReportCharts() {
    renderReportStatusChart();
    renderReportPriorityChart();
}

function renderReportStatusChart() {
    const canvas = document.getElementById('report-status-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const statuses = ['pendente', 'andamento', 'revisao', 'concluido'];
    const labels = ['Pendente', 'Em Andamento', 'Em Revisão', 'Concluído'];
    const colors = ['#f59e0b', '#2563eb', '#8b5cf6', '#10b981'];
    
    const data = statuses.map(s => filteredDemands.filter(d => d.status === s).length);
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const max = Math.max(...data, 1);
    const barWidth = (canvas.width - 100) / statuses.length;
    const barHeight = canvas.height - 80;
    const startX = 50;
    const startY = canvas.height - 30;
    
    data.forEach((value, index) => {
        const x = startX + index * barWidth + 20;
        const height = (value / max) * barHeight;
        const y = startY - height;
        
        ctx.fillStyle = colors[index];
        ctx.fillRect(x, y, barWidth - 40, height);
        
        // Número branco sem fundo
        const valueX = x + (barWidth - 40) / 2;
        const valueY = y - 8;
        const valueText = value.toString();
        
        // Desenhar número preto sem fundo
        ctx.fillStyle = '#1e293b';
        ctx.font = '600 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(valueText, valueX, valueY);
        
        // Label em preto
        ctx.fillStyle = '#1e293b';
        ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(labels[index], valueX, startY + 22);
    });
}
function renderReportPriorityChart() {
    const canvas = document.getElementById('report-priority-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const priorities = ['baixa', 'media', 'alta', 'urgente'];
    const labels = ['Baixa', 'Média', 'Alta', 'Urgente'];
    // Cores distintas e vibrantes para cada barra
    const colors = ['#10b981', '#fbbf24', '#f59e0b', '#ef4444'];
    
    const data = priorities.map(p => filteredDemands.filter(d => d.priority === p).length);
    const max = Math.max(...data, 1);
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const barWidth = (canvas.width - 100) / priorities.length;
    const barHeight = canvas.height - 80;
    const startX = 50;
    const startY = canvas.height - 30;
    
    data.forEach((value, index) => {
        const x = startX + index * barWidth + 20;
        const height = (value / max) * barHeight;
        const y = startY - height;
        
        ctx.fillStyle = colors[index];
        ctx.fillRect(x, y, barWidth - 40, height);
        
        // Número branco sem fundo
        const valueX = x + (barWidth - 40) / 2;
        const valueY = y - 8;
        const valueText = value.toString();
        
        // Desenhar número preto sem fundo
        ctx.fillStyle = '#1e293b';
        ctx.font = '600 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(valueText, valueX, valueY);
        
        // Label em preto
        ctx.fillStyle = '#1e293b';
        ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(labels[index], valueX, startY + 22);
    });
}

// Event Listeners para Relatórios e Dashboard
function setupReportListeners() {
    // Filtros de relatório
    const filterInputs = ['filter-status', 'filter-priority', 'filter-responsible', 'filter-date-start', 'filter-date-end'];
    filterInputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', applyFilters);
        }
    });
    
    // Filtros de dashboard
    const dashboardDateInputs = ['dashboard-date-start', 'dashboard-date-end'];
    dashboardDateInputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', () => {
                updateDashboard();
            });
        }
    });
    
    // Seletor de painel do dashboard
    const dashboardPanelSelector = document.getElementById('dashboard-panel-selector');
    if (dashboardPanelSelector) {
        dashboardPanelSelector.addEventListener('change', () => {
            updateDashboard();
        });
    }
    
    // Seletor de painel do relatório
    const reportPanelSelector = document.getElementById('report-panel-selector');
    if (reportPanelSelector) {
        reportPanelSelector.addEventListener('change', () => {
            applyFilters();
        });
    }
    
    // Modos de seleção de painéis
    const panelModeRadios = document.querySelectorAll('input[name="panel-selection-mode"]');
    panelModeRadios.forEach(radio => {
        radio.addEventListener('change', handlePanelSelectionModeChange);
    });
    
    // Botão gerar relatório
    const generateReportBtn = document.getElementById('generate-report-btn');
    if (generateReportBtn) {
        generateReportBtn.addEventListener('click', () => {
            applyFilters();
            // Scroll até os resultados
            const reportSummary = document.querySelector('.report-summary');
            if (reportSummary) {
                reportSummary.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }
    
    // Botão limpar seleção
    const clearSelectionBtn = document.getElementById('clear-panel-selection-btn');
    if (clearSelectionBtn) {
        clearSelectionBtn.addEventListener('click', () => {
            // Resetar para "Todos os Painéis"
            document.getElementById('panel-mode-all').checked = true;
            handlePanelSelectionModeChange();
            // Limpar outros filtros
            document.getElementById('filter-status').value = 'all';
            document.getElementById('filter-priority').value = 'all';
            document.getElementById('filter-responsible').value = 'all';
            document.getElementById('filter-date-start').value = '';
            document.getElementById('filter-date-end').value = '';
            // Aplicar filtros
            applyFilters();
        });
    }
    
    // Checkboxes de múltiplos painéis
    document.addEventListener('change', (e) => {
        if (e.target.classList.contains('panel-checkbox')) {
            applyFilters();
        }
    });
    
    // Inicializar modo de seleção
    handlePanelSelectionModeChange();
    
    // Botões
    const refreshDashboardBtn = document.getElementById('refresh-dashboard-btn');
    if (refreshDashboardBtn) {
        refreshDashboardBtn.addEventListener('click', () => {
            loadDemands();
            updateDashboard();
        });
    }
    
    // Redesenhar Gantt quando a janela for redimensionada
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            const dashboardPage = document.getElementById('dashboard-page');
            if (dashboardPage && dashboardPage.classList.contains('active')) {
                renderGanttChart();
            }
        }, 250);
    });
    
    const refreshReportBtn = document.getElementById('refresh-report-btn');
    if (refreshReportBtn) {
        refreshReportBtn.addEventListener('click', () => {
            updateReports();
        });
    }
    
    const exportReportBtn = document.getElementById('export-report-btn');
    if (exportReportBtn) {
        exportReportBtn.addEventListener('click', exportReport);
    }
    
    const exportPdfBtn = document.getElementById('export-pdf-btn');
    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', exportReportToPDF);
    }
}

function exportReport() {
    const data = filteredDemands.map(d => ({
        ID: d.id,
        Título: d.title,
        Descrição: d.description,
        Status: d.status,
        Prioridade: d.priority,
        Responsável: d.responsible,
        'Data Criação': new Date(d.createdAt).toLocaleDateString('pt-BR')
    }));
    
    // Converter para CSV
    const headers = Object.keys(data[0] || {});
    const csv = [
        headers.join(','),
        ...data.map(row => headers.map(h => `"${row[h] || ''}"`).join(','))
    ].join('\n');
    
    // Download
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_qualidade_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}

async function exportReportToPDF() {
    if (typeof window.jspdf === 'undefined') {
        alert('Biblioteca de PDF não carregada. Por favor, recarregue a página.');
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    // Cores
    const primaryColor = [37, 99, 235];
    const textColor = [30, 41, 59];
    const secondaryColor = [100, 116, 139];
    
    let yPosition = 20;
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);
    
    // Cabeçalho com marca QualixFlow
    pdf.setFillColor(...primaryColor);
    pdf.rect(margin, yPosition, contentWidth, 20, 'F');
    
    // Marca QualixFlow
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('QualixFlow', margin + 5, yPosition + 8);
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Onde dados se transformam em cuidado.', margin + 5, yPosition + 13);
    
    // Título do relatório (alinhado à direita)
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    const titleText = 'Relatório da Qualidade';
    const titleWidth = pdf.getTextWidth(titleText);
    pdf.text(titleText, pageWidth - margin - titleWidth, yPosition + 12);
    
    yPosition += 25;
    
    // Preparar data e hora para uso posterior
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    const timeStr = now.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Resumo
    pdf.setTextColor(...textColor);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Resumo do Relatório', margin, yPosition);
    
    yPosition += 7;
    
    // Período selecionado
    const dateStart = document.getElementById('filter-date-start')?.value;
    const dateEnd = document.getElementById('filter-date-end')?.value;
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...secondaryColor);
    
    if (dateStart && dateEnd) {
        const startFormatted = new Date(dateStart).toLocaleDateString('pt-BR');
        const endFormatted = new Date(dateEnd).toLocaleDateString('pt-BR');
        pdf.text(`Período: ${startFormatted} a ${endFormatted}`, margin, yPosition);
    } else if (dateStart) {
        const startFormatted = new Date(dateStart).toLocaleDateString('pt-BR');
        pdf.text(`Período: A partir de ${startFormatted}`, margin, yPosition);
    } else if (dateEnd) {
        const endFormatted = new Date(dateEnd).toLocaleDateString('pt-BR');
        pdf.text(`Período: Até ${endFormatted}`, margin, yPosition);
    } else {
        pdf.text('Período: Todo o período', margin, yPosition);
    }
    
    yPosition += 6;
    
    // Data de geração
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'italic');
    pdf.text(`Gerado em: ${dateStr} às ${timeStr}`, margin, yPosition);
    
    yPosition += 8;
    
    // Métricas do resumo
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...textColor);
    const total = filteredDemands.length;
    const concluidas = filteredDemands.filter(d => d.status === 'concluido').length;
    const taxa = total > 0 ? Math.round((concluidas / total) * 100) : 0;
    
    const summaryLines = [
        `Total de Demandas: ${total}`,
        `Concluídas: ${concluidas}`,
        `Taxa de Conclusão: ${taxa}%`
    ];
    
    summaryLines.forEach(line => {
        pdf.text(line, margin, yPosition);
        yPosition += 6;
    });
    
    yPosition += 5;
    
    // Filtros aplicados (outros filtros além do período)
    const statusFilter = document.getElementById('filter-status')?.value;
    const priorityFilter = document.getElementById('filter-priority')?.value;
    const responsibleFilter = document.getElementById('filter-responsible')?.value;
    
    const activeFilters = [];
    if (statusFilter && statusFilter !== 'all') {
        const statusLabels = {
            'pendente': 'Pendente',
            'andamento': 'Em Andamento',
            'revisao': 'Em Revisão',
            'concluido': 'Concluído'
        };
        activeFilters.push(`Status: ${statusLabels[statusFilter] || statusFilter}`);
    }
    if (priorityFilter && priorityFilter !== 'all') {
        const priorityLabels = {
            'baixa': 'Baixa',
            'media': 'Média',
            'alta': 'Alta',
            'urgente': 'Urgente'
        };
        activeFilters.push(`Prioridade: ${priorityLabels[priorityFilter] || priorityFilter}`);
    }
    if (responsibleFilter && responsibleFilter !== 'all') {
        activeFilters.push(`Responsável: ${responsibleFilter}`);
    }
    
    if (activeFilters.length > 0) {
        pdf.setFontSize(9);
        pdf.setTextColor(...secondaryColor);
        pdf.text('Filtros aplicados: ' + activeFilters.join(', '), margin, yPosition);
        yPosition += 8;
    }
    
    yPosition += 5;
    
    // Tabela de Demandas
    if (filteredDemands.length > 0) {
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...textColor);
        pdf.text('Detalhamento das Demandas', margin, yPosition);
        
        yPosition += 8;
        
        // Cabeçalho da tabela
        pdf.setFillColor(248, 250, 252);
        pdf.rect(margin, yPosition - 5, contentWidth, 8, 'F');
        
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...textColor);
        
        const colWidths = [15, 70, 25, 25, 35, 20];
        const headers = ['ID', 'Título', 'Status', 'Prioridade', 'Responsável', 'Dias'];
        let xPos = margin + 2;
        
        headers.forEach((header, index) => {
            pdf.text(header, xPos, yPosition);
            xPos += colWidths[index];
        });
        
        yPosition += 8;
        
        // Linhas da tabela
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        
        filteredDemands.forEach((demand, index) => {
            // Verificar se precisa de nova página
            if (yPosition > pageHeight - 30) {
                pdf.addPage();
                yPosition = 20;
                
                // Redesenhar cabeçalho da tabela
                pdf.setFillColor(248, 250, 252);
                pdf.rect(margin, yPosition - 5, contentWidth, 8, 'F');
                
                pdf.setFontSize(9);
                pdf.setFont('helvetica', 'bold');
                pdf.setTextColor(...textColor);
                
                xPos = margin + 2;
                headers.forEach((header, idx) => {
                    pdf.text(header, xPos, yPosition);
                    xPos += colWidths[idx];
                });
                
                yPosition += 8;
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(8);
            }
            
            const date = new Date(demand.createdAt);
            const daysOpen = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
            const formattedDate = date.toLocaleDateString('pt-BR');
            
            const statusLabels = {
                'pendente': 'Pendente',
                'andamento': 'Em Andamento',
                'revisao': 'Em Revisão',
                'concluido': 'Concluído'
            };
            
            const priorityLabels = {
                'baixa': 'Baixa',
                'media': 'Média',
                'alta': 'Alta',
                'urgente': 'Urgente'
            };
            
            // Alternar cor de fundo
            if (index % 2 === 0) {
                pdf.setFillColor(255, 255, 255);
            } else {
                pdf.setFillColor(248, 250, 252);
            }
            pdf.rect(margin, yPosition - 4, contentWidth, 6, 'F');
            
            pdf.setTextColor(...textColor);
            xPos = margin + 2;
            
            // ID
            pdf.text(`#${demand.id}`, xPos, yPosition);
            xPos += colWidths[0];
            
            // Título (truncar se muito longo)
            const title = demand.title.length > 35 ? demand.title.substring(0, 32) + '...' : demand.title;
            pdf.text(title, xPos, yPosition);
            xPos += colWidths[1];
            
            // Status
            pdf.text(statusLabels[demand.status] || demand.status, xPos, yPosition);
            xPos += colWidths[2];
            
            // Prioridade
            pdf.text(priorityLabels[demand.priority] || demand.priority, xPos, yPosition);
            xPos += colWidths[3];
            
            // Responsável (truncar se muito longo)
            const responsible = demand.responsible.length > 18 ? demand.responsible.substring(0, 15) + '...' : demand.responsible;
            pdf.text(responsible, xPos, yPosition);
            xPos += colWidths[4];
            
            // Dias
            pdf.text(`${daysOpen}d`, xPos, yPosition);
            
            yPosition += 6;
        });
    } else {
        pdf.setFontSize(10);
        pdf.setTextColor(...secondaryColor);
        pdf.text('Nenhuma demanda encontrada com os filtros aplicados.', margin, yPosition);
    }
    
    // Rodapé
    const pageCount = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(...secondaryColor);
        pdf.text(
            `Página ${i} de ${pageCount} - Qualishel - Escritório da Qualidade`,
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
        );
    }
    
    // Download
    const fileName = `relatorio_qualidade_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
}

// ========== RELATÓRIO DO CARD ==========

// Variável global para armazenar o ID da demanda atual no relatório
let currentReportDemandId = null;

window.generateCardReportPDF = function(demandId) {
    const demand = demands.find(d => d.id === demandId);
    if (!demand) {
        alert('Demanda não encontrada.');
        return;
    }
    
    currentReportDemandId = demandId;
    openCardReportModal(demand);
};

function openCardReportModal(demand) {
    const modal = document.getElementById('card-report-modal');
    const content = document.getElementById('card-report-content');
    
    if (!modal || !content) return;
    
    // Renderizar conteúdo do relatório
    renderCardReportContent(demand, content);
    
    // Abrir modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function renderCardReportContent(demand, container) {
    const statusLabels = {
        'pendente': 'Pendente',
        'andamento': 'Em Andamento',
        'revisao': 'Em Revisão',
        'concluido': 'Concluído'
    };
    
    const priorityLabels = {
        'baixa': 'Baixa',
        'media': 'Média',
        'alta': 'Alta',
        'urgente': 'Urgente'
    };
    
    const createdDate = new Date(demand.createdAt);
    const deadlineDate = demand.deadline ? new Date(demand.deadline) : null;
    
    let html = `
        <div class="card-report">
            <div class="report-header-info">
                <div class="report-brand">
                    <h2>QualixFlow</h2>
                    <p>Onde dados se transformam em cuidado.</p>
                </div>
                <div class="report-title">
                    <h1>Relatório da Demanda</h1>
                </div>
            </div>
            
            <div class="report-section">
                <h3 class="report-section-title">📋 Informações Básicas</h3>
                <div class="report-info-grid">
                    <div class="report-info-item">
                        <span class="report-label">ID:</span>
                        <span class="report-value">#${demand.id}</span>
                    </div>
                    <div class="report-info-item">
                        <span class="report-label">Título:</span>
                        <span class="report-value">${escapeHtml(demand.title)}</span>
                    </div>
                    <div class="report-info-item">
                        <span class="report-label">Status:</span>
                        <span class="report-value status-badge status-${demand.status}">${statusLabels[demand.status] || demand.status}</span>
                    </div>
                    <div class="report-info-item">
                        <span class="report-label">Prioridade:</span>
                        <span class="report-value priority-badge priority-${demand.priority}">${priorityLabels[demand.priority] || demand.priority}</span>
                    </div>
                    <div class="report-info-item">
                        <span class="report-label">Responsável:</span>
                        <span class="report-value">${escapeHtml(demand.responsible || 'Não atribuído')}</span>
                    </div>
                    <div class="report-info-item">
                        <span class="report-label">Data de Criação:</span>
                        <span class="report-value">${createdDate.toLocaleDateString('pt-BR')} ${createdDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    ${deadlineDate ? `
                    <div class="report-info-item">
                        <span class="report-label">Prazo:</span>
                        <span class="report-value">${deadlineDate.toLocaleDateString('pt-BR')}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
    `;
    
    // Descrição
    if (demand.description) {
        html += `
            <div class="report-section">
                <h3 class="report-section-title">📝 Descrição</h3>
                <div class="report-text-content">${convertUrlsToLinks(demand.description).replace(/\n/g, '<br>')}</div>
            </div>
        `;
    }
    
    // Matriz GUT
    if (demand.priorityStrategy === 'gut' && demand.gut) {
        html += `
            <div class="report-section">
                <h3 class="report-section-title">🧭 Matriz GUT</h3>
                <div class="report-info-grid">
                    <div class="report-info-item">
                        <span class="report-label">Gravidade:</span>
                        <span class="report-value">${demand.gut.gravidade}</span>
                    </div>
                    <div class="report-info-item">
                        <span class="report-label">Urgência:</span>
                        <span class="report-value">${demand.gut.urgencia}</span>
                    </div>
                    <div class="report-info-item">
                        <span class="report-label">Tendência:</span>
                        <span class="report-value">${demand.gut.tendencia}</span>
                    </div>
                    <div class="report-info-item">
                        <span class="report-label">Score GUT:</span>
                        <span class="report-value gut-score">${demand.gut.score}</span>
                    </div>
                    <div class="report-info-item">
                        <span class="report-label">Prioridade Calculada:</span>
                        <span class="report-value priority-badge priority-${demand.gut.priority}">${priorityLabels[demand.gut.priority] || demand.gut.priority}</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Análise 5W2H
    if (demand.w5h2 && demand.w5h2.enabled) {
        html += `
            <div class="report-section">
                <h3 class="report-section-title">📊 Análise 5W2H</h3>
                <div class="report-w5h2-grid">
        `;
        
        const w5h2Fields = [
            { label: 'O quê? (What)', value: demand.w5h2.what, icon: '🎯' },
            { label: 'Quem? (Who)', value: demand.w5h2.who, icon: '👤' },
            { label: 'Quando? (When)', value: demand.w5h2.when, icon: '📅' },
            { label: 'Onde? (Where)', value: demand.w5h2.where, icon: '📍' },
            { label: 'Por quê? (Why)', value: demand.w5h2.why, icon: '❓' },
            { label: 'Como? (How)', value: demand.w5h2.how, icon: '⚙️' },
            { label: 'Quanto custa? (How Much)', value: demand.w5h2.howMuch, icon: '💰' }
        ];
        
        w5h2Fields.forEach(field => {
            if (field.value) {
                html += `
                    <div class="report-w5h2-item">
                        <div class="w5h2-item-header">
                            <span class="w5h2-icon">${field.icon}</span>
                            <span class="w5h2-label">${field.label}</span>
                        </div>
                        <div class="w5h2-item-value">${escapeHtml(field.value).replace(/\n/g, '<br>')}</div>
                    </div>
                `;
            }
        });
        
        html += `
                </div>
            </div>
        `;
    }
    
    // Colaboradores
    if (demand.collaborators && demand.collaborators.length > 0) {
        html += `
            <div class="report-section">
                <h3 class="report-section-title">👥 Colaboradores</h3>
                <div class="report-list">
        `;
        demand.collaborators.forEach(collab => {
            html += `
                <div class="report-list-item">
                    <span class="list-icon">👤</span>
                    <span class="list-content">${escapeHtml(collab.name)}${collab.email ? ` (${escapeHtml(collab.email)})` : ''}</span>
                </div>
            `;
        });
        html += `
                </div>
            </div>
        `;
    }
    
    // Tarefas
    if (demand.tasks && demand.tasks.length > 0) {
        const totalTasks = demand.tasks.length;
        const completedTasks = demand.tasks.filter(t => t.completed).length;
        const progress = Math.round((completedTasks / totalTasks) * 100);
        
        html += `
            <div class="report-section">
                <h3 class="report-section-title">📋 Tarefas</h3>
                <div class="report-tasks-summary">
                    <span>Total: ${totalTasks} | Concluídas: ${completedTasks} | Progresso: ${progress}%</span>
                </div>
                <div class="report-list">
        `;
        demand.tasks.forEach(task => {
            const taskStatus = task.completed ? '✓' : '○';
            html += `
                <div class="report-list-item">
                    <span class="list-icon">${taskStatus}</span>
                    <div class="list-content">
                        <strong>${escapeHtml(task.text || task.title || 'Tarefa sem nome')}</strong>
                        ${task.description ? `<div class="task-description">${escapeHtml(task.description).replace(/\n/g, '<br>')}</div>` : ''}
                    </div>
                </div>
            `;
        });
        html += `
                </div>
            </div>
        `;
    }
    
    // Chat (últimas mensagens)
    if (demand.chat && demand.chat.length > 0) {
        html += `
            <div class="report-section">
                <h3 class="report-section-title">💬 Histórico de Conversas</h3>
                <div class="report-chat-list">
        `;
        const recentMessages = demand.chat.slice(-10);
        recentMessages.forEach(msg => {
            const msgDate = new Date(msg.timestamp);
            html += `
                <div class="report-chat-item">
                    <div class="chat-header">
                        <strong>${escapeHtml(msg.author)}</strong>
                        <span class="chat-date">${msgDate.toLocaleDateString('pt-BR')} ${msgDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div class="chat-message">${escapeHtml(msg.text).replace(/\n/g, '<br>')}</div>
                </div>
            `;
        });
        html += `
                </div>
            </div>
        `;
    }
    
    // Histórico de Mudanças
    if (demand.history && demand.history.length > 0) {
        html += `
            <div class="report-section">
                <h3 class="report-section-title">📜 Histórico de Mudanças</h3>
                <div class="report-history-list">
        `;
        demand.history.forEach(entry => {
            const entryDate = new Date(entry.timestamp);
            const actionLabels = {
                'created': 'Criado',
                'updated': 'Atualizado',
                'status_changed': 'Status alterado',
                'priority_changed': 'Prioridade alterada',
                'deadline_set': 'Prazo definido',
                'deadline_changed': 'Prazo alterado',
                'deadline_removed': 'Prazo removido'
            };
            html += `
                <div class="report-history-item">
                    <div class="history-header">
                        <strong>${escapeHtml(entry.user)}</strong>
                        <span class="history-date">${entryDate.toLocaleDateString('pt-BR')} ${entryDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div class="history-action">${actionLabels[entry.action] || entry.action}</div>
                    ${entry.details ? `
                    <div class="history-details">
                        ${Object.entries(entry.details).map(([key, value]) => `<span class="detail-item"><strong>${key}:</strong> ${value}</span>`).join(' ')}
                    </div>
                    ` : ''}
                </div>
            `;
        });
        html += `
                </div>
            </div>
        `;
    }
    
    html += `
            <div class="report-footer">
                <p>Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                <p>Qualishel - Escritório da Qualidade</p>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

function closeCardReportModal() {
    const modal = document.getElementById('card-report-modal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
    currentReportDemandId = null;
}

function printCardReport() {
    const content = document.getElementById('card-report-content');
    if (!content) return;
    
    // Criar uma nova janela para impressão
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Relatório da Demanda</title>
            <style>
                @media print {
                    @page {
                        margin: 1cm;
                    }
                }
                body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    color: #1e293b;
                    line-height: 1.6;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                }
                .card-report {
                    background: white;
                }
                .report-header-info {
                    border-bottom: 2px solid #2563eb;
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                }
                .report-brand h2 {
                    color: #2563eb;
                    margin: 0;
                    font-size: 24px;
                }
                .report-brand p {
                    color: #64748b;
                    margin: 5px 0 0 0;
                    font-size: 12px;
                }
                .report-title h1 {
                    color: #1e293b;
                    margin: 10px 0 0 0;
                    font-size: 28px;
                }
                .report-section {
                    margin-bottom: 30px;
                    page-break-inside: avoid;
                }
                .report-section-title {
                    color: #2563eb;
                    font-size: 18px;
                    margin-bottom: 15px;
                    border-bottom: 1px solid #e2e8f0;
                    padding-bottom: 8px;
                }
                .report-info-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 15px;
                }
                .report-info-item {
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                }
                .report-label {
                    font-weight: 600;
                    color: #64748b;
                    font-size: 12px;
                }
                .report-value {
                    color: #1e293b;
                    font-size: 14px;
                }
                .report-text-content {
                    color: #334155;
                    line-height: 1.8;
                    white-space: pre-wrap;
                }
                .report-list-item {
                    display: flex;
                    gap: 10px;
                    margin-bottom: 10px;
                    padding: 10px;
                    background: #f8fafc;
                    border-radius: 6px;
                }
                .report-footer {
                    margin-top: 40px;
                    padding-top: 20px;
                    border-top: 1px solid #e2e8f0;
                    text-align: center;
                    color: #64748b;
                    font-size: 12px;
                }
            </style>
        </head>
        <body>
            ${content.innerHTML}
        </body>
        </html>
    `);
    printWindow.document.close();
    
    // Aguardar o conteúdo carregar e então imprimir
    setTimeout(() => {
        printWindow.print();
    }, 250);
}

function generateCardReportPDFFromModal() {
    if (!currentReportDemandId) return;
    
    if (typeof window.jspdf === 'undefined') {
        alert('Biblioteca de PDF não carregada. Por favor, recarregue a página.');
        return;
    }
    
    const demand = demands.find(d => d.id === currentReportDemandId);
    if (!demand) {
        alert('Demanda não encontrada.');
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    // Cores
    const primaryColor = [37, 99, 235];
    const textColor = [30, 41, 59];
    const secondaryColor = [100, 116, 139];
    const successColor = [16, 185, 129];
    const warningColor = [245, 158, 11];
    const dangerColor = [239, 68, 68];
    
    let yPosition = 20;
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);
    
    // Função auxiliar para adicionar nova página se necessário
    const checkNewPage = (requiredSpace = 10) => {
        if (yPosition + requiredSpace > pageHeight - 20) {
            pdf.addPage();
            yPosition = 20;
            return true;
        }
        return false;
    };
    
    // Função auxiliar para adicionar texto com quebra de linha
    const addTextWithWrap = (text, x, startY, maxWidth, fontSize = 10) => {
        pdf.setFontSize(fontSize);
        const lines = pdf.splitTextToSize(text, maxWidth);
        let currentY = startY;
        lines.forEach((line, index) => {
            if (currentY + (fontSize * 0.4) > pageHeight - 20) {
                pdf.addPage();
                currentY = 20;
            }
            pdf.text(line, x, currentY);
            currentY += fontSize * 0.4;
        });
        return currentY;
    };
    
    // Cabeçalho
    pdf.setFillColor(...primaryColor);
    pdf.rect(margin, yPosition, contentWidth, 20, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('QualixFlow', margin + 5, yPosition + 8);
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Onde dados se transformam em cuidado.', margin + 5, yPosition + 13);
    
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    const titleText = 'Relatório da Demanda';
    const titleWidth = pdf.getTextWidth(titleText);
    pdf.text(titleText, pageWidth - margin - titleWidth, yPosition + 12);
    
    yPosition += 25;
    
    // Informações Básicas
    pdf.setTextColor(...textColor);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Informações Básicas', margin, yPosition);
    yPosition += 8;
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    
    // ID e Título
    pdf.setFont('helvetica', 'bold');
    pdf.text('ID:', margin, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`#${demand.id}`, margin + 15, yPosition);
    yPosition += 6;
    
    pdf.setFont('helvetica', 'bold');
    pdf.text('Título:', margin, yPosition);
    pdf.setFont('helvetica', 'normal');
    yPosition = addTextWithWrap(demand.title, margin + 20, yPosition, contentWidth - 20, 10);
    yPosition += 4;
    
    // Status
    pdf.setFont('helvetica', 'bold');
    pdf.text('Status:', margin, yPosition);
    pdf.setFont('helvetica', 'normal');
    const statusLabels = {
        'pendente': 'Pendente',
        'andamento': 'Em Andamento',
        'revisao': 'Em Revisão',
        'concluido': 'Concluído'
    };
    pdf.text(statusLabels[demand.status] || demand.status, margin + 20, yPosition);
    yPosition += 6;
    
    // Prioridade
    pdf.setFont('helvetica', 'bold');
    pdf.text('Prioridade:', margin, yPosition);
    pdf.setFont('helvetica', 'normal');
    const priorityLabels = {
        'baixa': 'Baixa',
        'media': 'Média',
        'alta': 'Alta',
        'urgente': 'Urgente'
    };
    pdf.text(priorityLabels[demand.priority] || demand.priority, margin + 30, yPosition);
    yPosition += 6;
    
    // Responsável
    pdf.setFont('helvetica', 'bold');
    pdf.text('Responsável:', margin, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(demand.responsible || 'Não atribuído', margin + 35, yPosition);
    yPosition += 6;
    
    // Data de Criação
    pdf.setFont('helvetica', 'bold');
    pdf.text('Data de Criação:', margin, yPosition);
    pdf.setFont('helvetica', 'normal');
    const createdDate = new Date(demand.createdAt);
    pdf.text(createdDate.toLocaleDateString('pt-BR') + ' ' + createdDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), margin + 40, yPosition);
    yPosition += 6;
    
    // Prazo (se houver)
    if (demand.deadline) {
        pdf.setFont('helvetica', 'bold');
        pdf.text('Prazo:', margin, yPosition);
        pdf.setFont('helvetica', 'normal');
        const deadlineDate = new Date(demand.deadline);
        pdf.text(deadlineDate.toLocaleDateString('pt-BR'), margin + 20, yPosition);
        yPosition += 6;
    }
    
    yPosition += 4;
    checkNewPage();
    
    // Descrição
    if (demand.description) {
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Descrição', margin, yPosition);
        yPosition += 6;
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        yPosition = addTextWithWrap(demand.description, margin, yPosition, contentWidth, 10);
        yPosition += 6;
        checkNewPage();
    }
    
    // Matriz GUT
    if (demand.priorityStrategy === 'gut' && demand.gut) {
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Matriz GUT', margin, yPosition);
        yPosition += 6;
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        
        pdf.setFont('helvetica', 'bold');
        pdf.text('Gravidade:', margin, yPosition);
        pdf.setFont('helvetica', 'normal');
        pdf.text(demand.gut.gravidade.toString(), margin + 30, yPosition);
        yPosition += 6;
        
        pdf.setFont('helvetica', 'bold');
        pdf.text('Urgência:', margin, yPosition);
        pdf.setFont('helvetica', 'normal');
        pdf.text(demand.gut.urgencia.toString(), margin + 30, yPosition);
        yPosition += 6;
        
        pdf.setFont('helvetica', 'bold');
        pdf.text('Tendência:', margin, yPosition);
        pdf.setFont('helvetica', 'normal');
        pdf.text(demand.gut.tendencia.toString(), margin + 30, yPosition);
        yPosition += 6;
        
        pdf.setFont('helvetica', 'bold');
        pdf.text('Score GUT:', margin, yPosition);
        pdf.setFont('helvetica', 'normal');
        pdf.text(demand.gut.score.toString(), margin + 30, yPosition);
        yPosition += 6;
        
        pdf.setFont('helvetica', 'bold');
        pdf.text('Prioridade Calculada:', margin, yPosition);
        pdf.setFont('helvetica', 'normal');
        pdf.text(priorityLabels[demand.gut.priority] || demand.gut.priority, margin + 50, yPosition);
        yPosition += 8;
        checkNewPage();
    }
    
    // Análise 5W2H
    if (demand.w5h2 && demand.w5h2.enabled) {
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Análise 5W2H', margin, yPosition);
        yPosition += 6;
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        
        const w5h2Fields = [
            { label: 'O quê? (What)', value: demand.w5h2.what },
            { label: 'Quem? (Who)', value: demand.w5h2.who },
            { label: 'Quando? (When)', value: demand.w5h2.when },
            { label: 'Onde? (Where)', value: demand.w5h2.where },
            { label: 'Por quê? (Why)', value: demand.w5h2.why },
            { label: 'Como? (How)', value: demand.w5h2.how },
            { label: 'Quanto custa? (How Much)', value: demand.w5h2.howMuch }
        ];
        
        w5h2Fields.forEach(field => {
            if (field.value) {
                pdf.setFont('helvetica', 'bold');
                pdf.text(field.label + ':', margin, yPosition);
                pdf.setFont('helvetica', 'normal');
                yPosition = addTextWithWrap(field.value, margin + 5, yPosition + 4, contentWidth - 5, 9);
                yPosition += 4;
                checkNewPage(8);
            }
        });
        
        yPosition += 4;
        checkNewPage();
    }
    
    // Colaboradores
    if (demand.collaborators && demand.collaborators.length > 0) {
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Colaboradores', margin, yPosition);
        yPosition += 6;
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        demand.collaborators.forEach(collab => {
            pdf.text(`• ${collab.name}${collab.email ? ' (' + collab.email + ')' : ''}`, margin + 5, yPosition);
            yPosition += 5;
            checkNewPage(5);
        });
        yPosition += 4;
        checkNewPage();
    }
    
    // Tarefas
    if (demand.tasks && demand.tasks.length > 0) {
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Tarefas', margin, yPosition);
        yPosition += 6;
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        
        const totalTasks = demand.tasks.length;
        const completedTasks = demand.tasks.filter(t => t.completed).length;
        
        pdf.text(`Total: ${totalTasks} | Concluídas: ${completedTasks} | Progresso: ${Math.round((completedTasks / totalTasks) * 100)}%`, margin, yPosition);
        yPosition += 6;
        
        demand.tasks.forEach((task, index) => {
            const taskStatus = task.completed ? '✓' : '○';
            pdf.text(`${taskStatus} ${task.text || task.title || 'Tarefa sem nome'}`, margin + 5, yPosition);
            if (task.description) {
                yPosition = addTextWithWrap(`  ${task.description}`, margin + 10, yPosition + 4, contentWidth - 10, 9);
            } else {
                yPosition += 5;
            }
            checkNewPage(8);
        });
        yPosition += 4;
        checkNewPage();
    }
    
    // Chat (últimas mensagens)
    if (demand.chat && demand.chat.length > 0) {
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Histórico de Conversas', margin, yPosition);
        yPosition += 6;
        
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        
        // Mostrar últimas 10 mensagens
        const recentMessages = demand.chat.slice(-10);
        recentMessages.forEach(msg => {
            const msgDate = new Date(msg.timestamp);
            pdf.setFont('helvetica', 'bold');
            pdf.text(`${msg.author} - ${msgDate.toLocaleDateString('pt-BR')} ${msgDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}:`, margin + 5, yPosition);
            pdf.setFont('helvetica', 'normal');
            yPosition = addTextWithWrap(msg.text, margin + 5, yPosition + 4, contentWidth - 5, 9);
            yPosition += 4;
            checkNewPage(8);
        });
        yPosition += 4;
        checkNewPage();
    }
    
    // Histórico de Mudanças
    if (demand.history && demand.history.length > 0) {
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Histórico de Mudanças', margin, yPosition);
        yPosition += 6;
        
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        
        demand.history.forEach(entry => {
            const entryDate = new Date(entry.timestamp);
            pdf.setFont('helvetica', 'bold');
            pdf.text(`${entryDate.toLocaleDateString('pt-BR')} ${entryDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - ${entry.user}:`, margin + 5, yPosition);
            pdf.setFont('helvetica', 'normal');
            
            const actionLabels = {
                'created': 'Criado',
                'updated': 'Atualizado',
                'status_changed': 'Status alterado',
                'priority_changed': 'Prioridade alterada',
                'deadline_set': 'Prazo definido',
                'deadline_changed': 'Prazo alterado',
                'deadline_removed': 'Prazo removido'
            };
            
            pdf.text(`  Ação: ${actionLabels[entry.action] || entry.action}`, margin + 5, yPosition + 4);
            if (entry.details) {
                const detailsText = Object.entries(entry.details).map(([key, value]) => `${key}: ${value}`).join(', ');
                yPosition = addTextWithWrap(`  Detalhes: ${detailsText}`, margin + 5, yPosition + 8, contentWidth - 5, 8);
            } else {
                yPosition += 8;
            }
            checkNewPage(10);
        });
        yPosition += 4;
    }
    
    // Rodapé em todas as páginas
    const pageCount = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(...secondaryColor);
        pdf.text(
            `Página ${i} de ${pageCount} - Qualishel - Escritório da Qualidade`,
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
        );
        
        // Data de geração
        const now = new Date();
        pdf.text(
            `Gerado em: ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
            pageWidth / 2,
            pageHeight - 5,
            { align: 'center' }
        );
    }
    
    // Download
    const fileName = `demanda_${demand.id}_${demand.title.substring(0, 20).replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
};

// ========== ARQUIVOS ==========

// Renderizar arquivos
function renderArchives() {
    renderArchivedPanels();
    renderArchivedDemands();
}

// Renderizar painéis arquivados
function renderArchivedPanels() {
    const container = document.getElementById('archived-panels-list');
    if (!container) return;
    
    const archivedPanels = panels.filter(p => p.archived);
    
    if (archivedPanels.length === 0) {
        container.innerHTML = '<p class="empty-message">Nenhum painel arquivado.</p>';
        return;
    }
    
    container.innerHTML = archivedPanels.map(panel => {
        const archivedDate = panel.archivedAt ? new Date(panel.archivedAt).toLocaleDateString('pt-BR') : 'Data desconhecida';
        return `
            <div class="archived-item">
                <div class="archived-item-info">
                    <h4>${escapeHtml(panel.name)}</h4>
                    <p class="archived-date">Arquivado em: ${archivedDate}</p>
                </div>
                <div class="archived-item-actions">
                    <button class="btn-secondary" onclick="restorePanel(${panel.id})" title="Restaurar">
                        ↺ Restaurar
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Renderizar demandas arquivadas
function renderArchivedDemands() {
    const container = document.getElementById('archived-demands-list');
    if (!container) return;
    
    const archivedDemands = demands.filter(d => d.archived);
    
    if (archivedDemands.length === 0) {
        container.innerHTML = '<p class="empty-message">Nenhuma demanda arquivada.</p>';
        return;
    }
    
    // Agrupar por painel
    const demandsByPanel = {};
    archivedDemands.forEach(demand => {
        const panelId = demand.panelId || 'sem-painel';
        if (!demandsByPanel[panelId]) {
            demandsByPanel[panelId] = [];
        }
        demandsByPanel[panelId].push(demand);
    });
    
    let html = '';
    Object.keys(demandsByPanel).forEach(panelId => {
        const panelDemands = demandsByPanel[panelId];
        const panel = panelId !== 'sem-painel' ? panels.find(p => p.id === parseInt(panelId)) : null;
        const panelName = panel ? panel.name : 'Sem painel';
        
        html += `<div class="archived-panel-group">
            <h4 class="panel-group-title">${escapeHtml(panelName)}</h4>
            <div class="archived-demands-grid">`;
        
        panelDemands.forEach(demand => {
            const archivedDate = demand.archivedAt ? new Date(demand.archivedAt).toLocaleDateString('pt-BR') : 'Data desconhecida';
            const statusLabels = {
                'pendente': 'Pendente',
                'andamento': 'Em Andamento',
                'revisao': 'Em Revisão',
                'concluido': 'Concluído'
            };
            const statusLabel = statusLabels[demand.status] || demand.status;
            
            html += `
                <div class="archived-item">
                    <div class="archived-item-info">
                        <h4>${escapeHtml(demand.title)}</h4>
                        <p class="archived-meta">
                            <span class="status-badge status-${demand.status}">${statusLabel}</span>
                            <span class="archived-date">Arquivado em: ${archivedDate}</span>
                        </p>
                    </div>
                    <div class="archived-item-actions">
                        <button class="btn-secondary" onclick="restoreDemand(${demand.id})" title="Restaurar">
                            ↺ Restaurar
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += `</div></div>`;
    });
    
    container.innerHTML = html;
}

// Restaurar painel
window.restorePanel = function(panelId) {
    const panel = panels.find(p => p.id === panelId);
    if (!panel) return;
    
    if (confirm(`Tem certeza que deseja restaurar o painel "${panel.name}"?`)) {
        panel.archived = false;
        panel.archivedAt = null;
        
        // Restaurar também as demandas do painel
        demands.forEach(d => {
            if (d.panelId === panelId && d.archived) {
                d.archived = false;
                d.archivedAt = null;
            }
        });
        
        savePanels();
        saveDemands();
        renderArchives();
        renderPanelSelector();
        renderKanban();
        updateCardCounts();
    }
};

// Restaurar demanda
window.restoreDemand = function(demandId) {
    const demand = demands.find(d => d.id === demandId);
    if (!demand) return;
    
    if (confirm(`Tem certeza que deseja restaurar a demanda "${demand.title}"?`)) {
        demand.archived = false;
        demand.archivedAt = null;
        
        // Se o painel estiver arquivado, restaurar também
        if (demand.panelId) {
            const panel = panels.find(p => p.id === demand.panelId);
            if (panel && panel.archived) {
                panel.archived = false;
                panel.archivedAt = null;
                savePanels();
                renderPanelSelector();
            }
        }
        
        saveDemands();
        renderArchives();
        renderKanban();
        updateCardCounts();
        updateDashboard();
    }
};