// Estado da aplicação
let panels = []; // Array de painéis/projetos
let currentPanelId = null; // ID do painel atual selecionado
let panelIdCounter = 1; // Contador de IDs para painéis
let demands = [];
let demandIdCounter = 1;
let availablePeople = []; // Lista de pessoas disponíveis para colaboração

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

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    // Verificar se é um convite (link com parâmetros)
    const urlParams = new URLSearchParams(window.location.search);
    const isInvite = urlParams.get('invite') === 'true';
    
    // Se não for convite e não estiver autenticado, redirecionar para login
    if (!isInvite && localStorage.getItem('qualishel_authenticated') !== 'true') {
        window.location.href = 'login.html';
        return;
    }
    
    // Se for convite mas não estiver autenticado, permitir acesso temporário
    if (isInvite && localStorage.getItem('qualishel_authenticated') !== 'true') {
        // Autenticar automaticamente para convidados
        localStorage.setItem('qualishel_authenticated', 'true');
        localStorage.setItem('qualishel_current_user', 'Convidado');
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
        panelForm = document.getElementById('panel-form');
        cancelPanelFormBtn = document.getElementById('cancel-panel-form-btn');
        createPanelBtn = document.getElementById('create-panel-btn');
        
        await loadPanels();
        await loadDemands();
        renderPanelSelector();
        setupEventListeners();
        renderKanban();
        updateCardCounts();
        setupReportListeners();
        loadEmailConfig();
        initializeEmailJS();
        
        // Se for um convite, mostrar mensagem e focar na demanda
        if (isInvite && demandId) {
            const invitePanelId = panelIdParam ? parseInt(panelIdParam) : null;
            handleInviteAccess(parseInt(demandId), invitePanelId);
        }
    }, 100);
});

// Função para lidar com acesso via convite
function handleInviteAccess(demandId, panelId = null) {
    const demand = demands.find(d => d.id === demandId);
    
    if (!demand) {
        // Demanda não encontrada - pode ainda estar carregando
        setTimeout(() => handleInviteAccess(demandId, panelId), 500);
        return;
    }
    
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
        
        // Aguardar um pouco para garantir que o seletor foi atualizado
        setTimeout(() => {
            renderPanelSelector();
            renderKanban();
            updateCardCounts();
            updateDashboard();
        }, 100);
    } else if (!targetPanelId) {
        // Se não há painel, renderizar mesmo assim
        renderKanban();
        updateCardCounts();
    }
    
    // Obter informações do painel
    const panel = panels.find(p => p.id === targetPanelId);
    
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
    
    // Scroll até o card da demanda
    setTimeout(() => {
        const card = document.querySelector(`[data-id="${demandId}"]`);
        if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            card.style.boxShadow = '0 0 20px rgba(37, 99, 235, 0.5)';
            setTimeout(() => {
                card.style.boxShadow = '';
            }, 3000);
        }
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
    
    // Focar na demanda
    setTimeout(() => {
        const card = document.querySelector(`[data-id="${demandId}"]`);
        if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            card.style.boxShadow = '0 0 20px rgba(37, 99, 235, 0.5)';
            setTimeout(() => {
                card.style.boxShadow = '';
                // Abrir modal de tarefas/chat automaticamente
                openTasksChat(demandId);
            }, 1000);
        }
    }, 300);
};

// Event Listeners
// Função para fazer logout
function handleLogout() {
    if (confirm('Tem certeza que deseja sair?')) {
        localStorage.removeItem('qualishel_authenticated');
        localStorage.removeItem('qualishel_current_user');
        window.location.href = 'login.html';
    }
}

function setupEventListeners() {
    // Botão de logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    // Modal de Demanda
    addDemandBtn.addEventListener('click', () => openModal());
    closeModalBtn.addEventListener('click', () => closeModal());
    cancelBtn.addEventListener('click', () => closeModal());
    demandModal.addEventListener('click', (e) => {
        if (e.target === demandModal) closeModal();
    });

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

    // Configuração de Usuário
    const saveUserNameBtn = document.getElementById('save-user-name-btn');
    if (saveUserNameBtn) {
        saveUserNameBtn.addEventListener('click', saveUserName);
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
    if (panelFormModal) {
        panelFormModal.addEventListener('click', (e) => {
            if (e.target === panelFormModal) closePanelFormModal();
        });
    }

    // Formulário
    demandForm.addEventListener('submit', handleFormSubmit);

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
}

function closeModal() {
    demandModal.classList.remove('active');
    document.body.style.overflow = '';
    demandForm.reset();
    document.querySelector('.modal-header h3').textContent = 'Nova Demanda';
    // Restaurar comportamento padrão do formulário
    demandForm.onsubmit = handleFormSubmit;
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
    if (pageName === 'dashboard') {
        updateDashboard();
    } else if (pageName === 'relatorios') {
        updateReports();
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

    const demand = {
        id: demandIdCounter++,
        panelId: currentPanelId, // Associar demanda ao painel atual
        title: document.getElementById('demand-title').value,
        description: document.getElementById('demand-description').value,
        priority: document.getElementById('demand-priority').value,
        responsible: document.getElementById('demand-responsible').value || 'Não atribuído',
        status: document.getElementById('demand-status').value,
        createdAt: new Date().toISOString(),
        collaborators: [],
        tasks: [],
        chat: []
    };

    demands.push(demand);
    saveDemands();
    renderKanban();
    updateCardCounts();
    updateDashboard(); // Atualizar dashboard se estiver visível
    closeModal();
}

// Renderização do Kanban
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
        
        // Filtrar demandas do painel atual
        const demandsInColumn = demands.filter(d => d.status === status && d.panelId === currentPanelId);
        
        if (demandsInColumn.length === 0) {
            column.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📋</div>
                    <p>Nenhuma demanda aqui</p>
                </div>
            `;
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
                        <div class="summary-banner-description">${escapeHtml(demand.description)}</div>
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
            <div class="card-bar-content">
                <span class="card-bar-priority ${priorityClass}">${priorityLabel}</span>
                <div class="card-bar-title">${escapeHtml(demand.title)}</div>
                ${deadlineIconHtml}
            </div>
            ${summaryBannerHtml}
        </div>
        <button class="card-delete-btn" onclick="deleteDemand(${demand.id})" aria-label="Excluir demanda">
            🗑️
        </button>
        <div class="card-content">
            <div class="card-actions">
                <button class="card-action-btn" onclick="editDemand(${demand.id})" title="Editar">
                    ✏️
                </button>
                <button class="card-action-btn" onclick="manageCollaborators(${demand.id})" title="Gerenciar Colaboradores">
                    👥
                </button>
            </div>
            <div class="card-header">
                <div class="card-title">${escapeHtml(demand.title)}</div>
            </div>
            ${demand.description ? `<div class="card-description">${escapeHtml(demand.description)}</div>` : ''}
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
            // Se está mudando para "em andamento" e não tinha prazo definido, abrir modal
            if (newStatus === 'andamento' && oldStatus !== 'andamento' && !demand.deadline) {
                pendingDemandId = demandId;
                // Atualizar status e renderizar para que o card apareça na coluna correta
                demand.status = newStatus;
                saveDemands();
                renderKanban();
                updateCardCounts();
                // Abrir modal após um pequeno delay para visualização
                setTimeout(() => {
                    openDeadlineModal();
                }, 100);
            } else {
                // Se não precisa de prazo, atualizar normalmente
                demand.status = newStatus;
                saveDemands();
                renderKanban();
                updateCardCounts();
                updateDashboard();
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

    document.getElementById('demand-title').value = demand.title;
    document.getElementById('demand-description').value = demand.description;
    document.getElementById('demand-priority').value = demand.priority;
    document.getElementById('demand-responsible').value = demand.responsible;
    document.getElementById('demand-status').value = demand.status;

    // Alterar o comportamento do formulário para editar
    demandForm.onsubmit = (e) => {
        e.preventDefault();
        
        demand.title = document.getElementById('demand-title').value;
        demand.description = document.getElementById('demand-description').value;
        demand.priority = document.getElementById('demand-priority').value;
        demand.responsible = document.getElementById('demand-responsible').value;
        demand.status = document.getElementById('demand-status').value;

        saveDemands();
        renderKanban();
        updateCardCounts();
        updateDashboard(); // Atualizar dashboard se estiver visível
        closeModal();
        
        // Restaurar comportamento padrão
        demandForm.onsubmit = handleFormSubmit;
    };

    document.querySelector('.modal-header h3').textContent = 'Editar Demanda';
    openModal();
}

// Excluir Demanda
function deleteDemand(id) {
    if (confirm('Tem certeza que deseja excluir esta demanda?')) {
        demands = demands.filter(d => d.id !== id);
        saveDemands();
        renderKanban();
        updateCardCounts();
        updateDashboard(); // Atualizar dashboard se estiver visível
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
    
    panelSelector.innerHTML = '<option value="">Selecione um painel...</option>';
    
    panels.forEach(panel => {
        const option = document.createElement('option');
        option.value = panel.id;
        option.textContent = panel.name;
        if (panel.id === currentPanelId) {
            option.selected = true;
        }
        panelSelector.appendChild(option);
    });
    
    // Atualizar também os seletores do dashboard e relatório
    renderDashboardPanelSelector();
    renderReportPanelSelector();
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
    
    reportSelector.innerHTML = '<option value="">Todos os Painéis</option>';
    
    panels.forEach(panel => {
        const option = document.createElement('option');
        option.value = panel.id;
        option.textContent = panel.name;
        reportSelector.appendChild(option);
    });
}

function handlePanelChange(e) {
    const panelId = parseInt(e.target.value);
    if (panelId) {
        currentPanelId = panelId;
        savePanels();
        renderKanban();
        updateCardCounts();
        updateDashboard();
    } else {
        currentPanelId = null;
        savePanels();
        renderKanban();
        updateCardCounts();
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
                    <button class="btn-secondary" onclick="deletePanel(${panel.id})" title="Excluir">
                        🗑️
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
    if (!confirm('Tem certeza que deseja excluir este painel? Todas as demandas associadas também serão excluídas.')) {
        return;
    }
    
    // Remover painel
    panels = panels.filter(p => p.id !== panelId);
    
    // Remover demandas do painel
    demands = demands.filter(d => d.panelId !== panelId);
    
    // Se o painel excluído era o atual, selecionar outro ou limpar
    if (currentPanelId === panelId) {
        if (panels.length > 0) {
            currentPanelId = panels[0].id;
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

// Persistência de Painéis
function savePanels() {
    localStorage.setItem('qualishel-panels', JSON.stringify(panels));
    localStorage.setItem('qualishel-panel-counter', panelIdCounter.toString());
    localStorage.setItem('qualishel-current-panel', currentPanelId ? currentPanelId.toString() : '');
}

async function loadPanels() {
    const saved = localStorage.getItem('qualishel-panels');
    const counter = localStorage.getItem('qualishel-panel-counter');
    const currentPanel = localStorage.getItem('qualishel-current-panel');
    
    if (saved) {
        panels = JSON.parse(saved);
    }
    
    if (counter) {
        panelIdCounter = parseInt(counter);
    }
    
    if (currentPanel) {
        currentPanelId = parseInt(currentPanel);
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
    
    // Sempre salvar no localStorage primeiro (rápido)
    localStorage.setItem('qualishel-demands', JSON.stringify(demands));
    localStorage.setItem('qualishel-demand-counter', demandIdCounter.toString());
    
    // Tentar salvar no Firebase em background (se disponível)
    if (typeof window.firebaseService !== 'undefined' && window.firebaseService.isInitialized()) {
        window.firebaseService.saveDemandsToStorage(demands, demandIdCounter).catch(err => {
            console.warn('Erro ao sincronizar com Firebase:', err);
        });
    }
}

async function loadDemands() {
    let savedData = { demands: [], counter: 1 };
    let savedPeople = [];
    
    // Tentar carregar do Firebase primeiro, se disponível
    if (typeof window.firebaseService !== 'undefined' && window.firebaseService.isInitialized()) {
        try {
            savedData = await window.firebaseService.loadDemandsFromStorage();
            savedPeople = await window.firebaseService.loadPeopleFromStorage();
            console.log('✅ Dados carregados do Firebase');
        } catch (error) {
            console.warn('Erro ao carregar do Firebase, usando localStorage:', error);
            // Fallback para localStorage
            const saved = localStorage.getItem('qualishel-demands');
            const counter = localStorage.getItem('qualishel-demand-counter');
            const savedPeopleStr = localStorage.getItem('qualishel-people');
            
            if (saved) {
                savedData.demands = JSON.parse(saved);
            }
            
            if (counter) {
                savedData.counter = parseInt(counter);
            }
            
            if (savedPeopleStr) {
                savedPeople = JSON.parse(savedPeopleStr);
            }
        }
    } else {
        // Usar localStorage
        const saved = localStorage.getItem('qualishel-demands');
        const counter = localStorage.getItem('qualishel-demand-counter');
        const savedPeopleStr = localStorage.getItem('qualishel-people');
        
        if (saved) {
            savedData.demands = JSON.parse(saved);
        }
        
        if (counter) {
            savedData.counter = parseInt(counter);
        }
        
        if (savedPeopleStr) {
            savedPeople = JSON.parse(savedPeopleStr);
        }
    }
    
    demands = savedData.demands;
    demandIdCounter = savedData.counter;
    
    // Garantir que todos os chats sejam preservados e nunca apagados
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
    
    // Garantir que todas as demandas tenham o campo collaborators
    demands.forEach(demand => {
        if (!demand.collaborators) {
            demand.collaborators = [];
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
    
    // Renderizar pessoas disponíveis
    updateAvailablePeopleList();
}

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
        await sendInviteEmail(name, email, demand);
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
            await sendInviteEmail(name, email, demand);
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
        await sendInviteEmail(name, email, demand);
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

function saveUserName() {
    const userNameInput = document.getElementById('user-name');
    const userName = userNameInput ? userNameInput.value.trim() : '';
    
    if (!userName) {
        alert('Por favor, informe seu nome.');
        return;
    }
    
    currentUserName = userName;
    localStorage.setItem('qualishel-user-name', userName);
    
    showEmailNotification('Nome salvo com sucesso!', 'success');
}

function loadSettingsPage() {
    // Carregar configurações de e-mail
    loadEmailConfig();
    updateEmailStatus();
    
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
}

function initializeEmailJS() {
    if (typeof emailjs !== 'undefined' && emailConfig.publicKey) {
        emailjs.init(emailConfig.publicKey);
    }
}

async function sendInviteEmail(collaboratorName, collaboratorEmail, demand) {
    // Verificar se EmailJS está configurado
    if (!emailConfig.publicKey || !emailConfig.serviceId || !emailConfig.templateId) {
        console.warn('EmailJS não configurado. Configure nas opções para enviar e-mails.');
        return;
    }
    
    if (typeof emailjs === 'undefined') {
        console.error('Biblioteca EmailJS não carregada.');
        return;
    }
    
    try {
        // Obter informações do painel
        const panelId = demand.panelId || currentPanelId;
        const panel = panels.find(p => p.id === panelId);
        const panelName = panel ? panel.name : 'Painel Principal';
        
        // Obter URL do site (para o link de acesso)
        // Usar a URL atual sem o arquivo, garantindo que funcione em qualquer ambiente
        let siteUrl = window.location.origin;
        const pathname = window.location.pathname;
        // Se estiver em um subdiretório, manter o caminho base
        if (pathname && pathname !== '/' && pathname !== '/index.html') {
            const pathParts = pathname.split('/').filter(p => p && p !== 'index.html');
            if (pathParts.length > 0) {
                siteUrl += '/' + pathParts.join('/');
            }
        }
        
        // Garantir que panelId seja válido
        const validPanelId = panelId || demand.panelId || currentPanelId;
        
        // Incluir panelId no link para garantir acesso ao painel correto
        const accessLink = `${siteUrl}/index.html?demand=${demand.id}&panel=${validPanelId}&invite=true`;
        
        // Preparar dados do template
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
            message: `Você foi convidado para colaborar na demanda "${demand.title}" do painel "${panelName}".`,
            access_link: accessLink,
            site_url: siteUrl
        };
        
        // Enviar e-mail
        await emailjs.send(
            emailConfig.serviceId,
            emailConfig.templateId,
            templateParams
        );
        
        console.log('E-mail enviado com sucesso para', collaboratorEmail);
        // Mostrar notificação visual
        showEmailNotification('E-mail enviado com sucesso!', 'success');
        
    } catch (error) {
        console.error('Erro ao enviar e-mail:', error);
        showEmailNotification('Erro ao enviar e-mail. Verifique a configuração.', 'error');
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
        demand.tasks[index].completed = !demand.tasks[index].completed;
        saveDemands();
        renderTasks();
        updateCardCounts();
        updateDashboard();
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
    
    input.value = '';
}

// Utilitário
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
    
    // Obter demandas filtradas por período do dashboard
    let dashboardDemands = selectedPanelId ? demands.filter(d => d.panelId === selectedPanelId) : demands;
    
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

    document.getElementById('metric-total').textContent = total;
    document.getElementById('metric-pendentes').textContent = pendentes;
    document.getElementById('metric-andamento').textContent = andamento;
    document.getElementById('metric-concluidas').textContent = concluidas;
    document.getElementById('metric-urgentes').textContent = urgentes;
    document.getElementById('metric-taxa').textContent = taxa + '%';
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
        
        // Legenda
        const labelAngle = currentAngle + sliceAngle / 2;
        const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7);
        const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(value.toString(), labelX, labelY);
        
        currentAngle += sliceAngle;
    });
    
    // Legenda externa
    const legendY = centerY + radius + 30;
    labels.forEach((label, index) => {
        const x = (canvas.width / labels.length) * (index + 0.5);
        ctx.fillStyle = colors[index];
        ctx.fillRect(x - 40, legendY - 8, 16, 16);
        ctx.fillStyle = '#1e293b';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(label, x - 20, legendY);
    });
}

function renderPriorityChart() {
    const canvas = document.getElementById('priority-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const priorities = ['baixa', 'media', 'alta', 'urgente'];
    const labels = ['Baixa', 'Média', 'Alta', 'Urgente'];
    const colors = ['#d1fae5', '#fef3c7', '#fee2e2', '#fecaca'];
    const textColors = ['#065f46', '#92400e', '#991b1b', '#7f1d1d'];
    
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
        
        // Valor
        ctx.fillStyle = textColors[index];
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(value.toString(), x + (barWidth - 40) / 2, y - 5);
        
        // Label
        ctx.fillStyle = '#64748b';
        ctx.font = '11px sans-serif';
        ctx.fillText(labels[index], x + (barWidth - 40) / 2, startY + 20);
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
        
        // Valor
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(value.toString(), x + (barWidth - 20) / 2, y - 5);
        
        // Data
        const day = last7Days[index].getDate();
        const month = last7Days[index].getMonth() + 1;
        ctx.fillStyle = '#64748b';
        ctx.font = '10px sans-serif';
        ctx.fillText(`${day}/${month}`, x + (barWidth - 20) / 2, startY + 20);
    });
}

function renderGanttChart() {
    const canvas = document.getElementById('gantt-chart');
    if (!canvas) return;
    
    // Ajustar tamanho do canvas para ser responsivo
    const container = canvas.parentElement;
    const containerWidth = container.clientWidth - 32; // Padding
    const minWidth = 1000;
    const canvasWidth = Math.max(containerWidth, minWidth);
    const canvasHeight = 400;
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    const ctx = canvas.getContext('2d');
    
    // Filtrar demandas que têm prazo ou estão em andamento/revisão/concluído
    const dashboardDemands = getDashboardDemands();
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
    
    // Configurações
    const padding = 40;
    const labelWidth = 200;
    const chartWidth = canvas.width - labelWidth - padding * 2;
    const rowHeight = 30;
    const rowSpacing = 10;
    const chartHeight = ganttDemands.length * (rowHeight + rowSpacing);
    const startY = 60;
    
    // Limpar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Desenhar fundo
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(labelWidth + padding, startY, chartWidth, chartHeight);
    
    // Desenhar grade de semanas
    ctx.strokeStyle = '#e2e8f0';
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
        
        // Label do dia
        if (daysDiff % 7 === 0 || daysDiff === 0) {
            ctx.fillStyle = '#64748b';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            const dateStr = currentDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            ctx.fillText(dateStr, x, startY - 10);
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
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, startY - 20);
        ctx.lineTo(x, startY + chartHeight);
        ctx.stroke();
        
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Hoje', x, startY - 25);
    }
    
    // Desenhar barras de Gantt
    ganttDemands.forEach((demand, index) => {
        const y = startY + index * (rowHeight + rowSpacing);
        
        // Label da demanda
        ctx.fillStyle = '#1e293b';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'left';
        const title = demand.title.length > 25 ? demand.title.substring(0, 22) + '...' : demand.title;
        ctx.fillText(title, 10, y + rowHeight / 2 + 4);
        
        // Calcular posição da barra
        const startDate = new Date(demand.createdAt);
        const endDate = demand.deadline ? new Date(demand.deadline) : now;
        
        const startDays = Math.floor((startDate - minDate) / (1000 * 60 * 60 * 24));
        const endDays = Math.floor((endDate - minDate) / (1000 * 60 * 60 * 24));
        
        const barX = labelWidth + padding + (startDays * dayWidth);
        const barWidth = (endDays - startDays) * dayWidth;
        
        // Cor baseada no status
        let color = '#2563eb'; // Azul padrão (em andamento)
        if (demand.status === 'revisao') {
            color = '#8b5cf6'; // Roxo
        } else if (demand.status === 'concluido') {
            color = '#10b981'; // Verde
        }
        
        // Verificar se está vencido
        const isOverdue = endDate < now && demand.status !== 'concluido';
        if (isOverdue) {
            color = '#ef4444'; // Vermelho
        }
        
        // Desenhar barra
        ctx.fillStyle = color;
        ctx.fillRect(barX, y, barWidth, rowHeight);
        
        // Borda da barra
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, y, barWidth, rowHeight);
        
        // Indicador de início (bolinha)
        ctx.beginPath();
        ctx.arc(barX, y + rowHeight / 2, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Indicador de fim (bolinha)
        ctx.beginPath();
        ctx.arc(barX + barWidth, y + rowHeight / 2, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Texto na barra (se houver espaço)
        if (barWidth > 60) {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 9px sans-serif';
            ctx.textAlign = 'center';
            const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
            ctx.fillText(`${days} dia(s)`, barX + barWidth / 2, y + rowHeight / 2 + 3);
        }
    });
    
    // Título
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Cronograma de Demandas', 10, 30);
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

function updateReports() {
    loadDemands(); // Recarregar dados
    populateResponsibleFilter();
    applyFilters();
}

function populateResponsibleFilter() {
    const select = document.getElementById('filter-responsible');
    if (!select) return;
    
    const responsibles = [...new Set(demands.map(d => d.responsible || 'Não atribuído'))];
    
    select.innerHTML = '<option value="all">Todos</option>' +
        responsibles.map(r => `<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`).join('');
}

function applyFilters() {
    // Obter painel selecionado no relatório (ou usar o painel atual)
    const reportPanelSelector = document.getElementById('report-panel-selector');
    const selectedPanelId = reportPanelSelector?.value ? parseInt(reportPanelSelector.value) : currentPanelId;
    
    // Filtrar por painel primeiro
    let filteredDemands = selectedPanelId ? demands.filter(d => d.panelId === selectedPanelId) : demands;
    
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
    
    updateReportSummary();
    updateReportTable();
    renderReportCharts();
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
    
    const total = filteredDemands.length;
    const concluidas = filteredDemands.filter(d => d.status === 'concluido').length;
    const taxa = total > 0 ? Math.round((concluidas / total) * 100) : 0;
    
    // Calcular tempo médio
    const concluidasWithDate = filteredDemands.filter(d => d.status === 'concluido');
    let avgTime = '-';
    if (concluidasWithDate.length > 0) {
        // Para simplificar, vamos usar a data de criação como referência
        avgTime = 'N/A';
    }
    
    // Demanda mais antiga
    let oldest = '-';
    if (filteredDemands.length > 0) {
        const oldestDemand = filteredDemands.reduce((oldest, current) => {
            return new Date(current.createdAt) < new Date(oldest.createdAt) ? current : oldest;
        });
        const date = new Date(oldestDemand.createdAt);
        oldest = date.toLocaleDateString('pt-BR');
    }
    
    document.getElementById('report-total').textContent = total;
    document.getElementById('report-avg-time').textContent = avgTime;
    document.getElementById('report-oldest').textContent = oldest;
    document.getElementById('report-completion').textContent = taxa + '%';
}

function updateReportTable() {
    const tbody = document.getElementById('report-table-body');
    if (!tbody) return;
    
    if (filteredDemands.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem;">Nenhuma demanda encontrada</td></tr>';
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
        
        return `
            <tr>
                <td>#${demand.id}</td>
                <td>${escapeHtml(demand.title)}</td>
                <td><span class="status-badge status-${demand.status}">${statusLabels[demand.status]}</span></td>
                <td><span class="card-priority priority-${demand.priority}">${priorityLabels[demand.priority]}</span></td>
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
        
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(value.toString(), x + (barWidth - 40) / 2, y - 5);
        
        ctx.fillStyle = '#64748b';
        ctx.font = '11px sans-serif';
        ctx.fillText(labels[index], x + (barWidth - 40) / 2, startY + 20);
    });
}

function renderReportPriorityChart() {
    const canvas = document.getElementById('report-priority-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const priorities = ['baixa', 'media', 'alta', 'urgente'];
    const labels = ['Baixa', 'Média', 'Alta', 'Urgente'];
    const colors = ['#d1fae5', '#fef3c7', '#fee2e2', '#fecaca'];
    const textColors = ['#065f46', '#92400e', '#991b1b', '#7f1d1d'];
    
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
        
        ctx.fillStyle = textColors[index];
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(value.toString(), x + (barWidth - 40) / 2, y - 5);
        
        ctx.fillStyle = '#64748b';
        ctx.font = '11px sans-serif';
        ctx.fillText(labels[index], x + (barWidth - 40) / 2, startY + 20);
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
    
    // Cabeçalho
    pdf.setFillColor(...primaryColor);
    pdf.rect(margin, yPosition, contentWidth, 15, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Relatório de Qualidade', margin + 5, yPosition + 10);
    
    yPosition += 20;
    
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

