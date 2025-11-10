// Serviço Firebase para Qualishel
// Este arquivo gerencia a integração com Firebase Firestore

let firebaseInitialized = false;
let db = null;

// Função para obter o ID do usuário atual (isolamento por usuário)
function getCurrentUserId() {
    const currentUser = localStorage.getItem('qualishel_current_user');
    if (!currentUser) {
        console.warn('⚠️ Nenhum usuário autenticado. Usando "guest" como ID.');
        return 'guest';
    }
    // Usar o username como ID do usuário (pode ser melhorado com hash)
    const userId = currentUser.toLowerCase().replace(/\s+/g, '_');
    console.log(`🔑 UserId gerado: ${userId} (de username: ${currentUser})`);
    return userId;
}

// Verificar se Firebase está disponível
function checkFirebaseAvailable() {
    return typeof window.db !== 'undefined' && window.db !== null;
}

// Inicializar Firebase (chamado automaticamente se configurado)
function initializeFirebase() {
    if (checkFirebaseAvailable()) {
        db = window.db;
        firebaseInitialized = true;
        console.log('✅ Firebase inicializado com sucesso');
        return true;
    }
    console.log('ℹ️ Firebase não configurado. Usando localStorage.');
    return false;
}

// Função para salvar demandas (usa Firebase se disponível, senão localStorage)
async function saveDemandsToStorage(demands, counter) {
    const userId = getCurrentUserId();
    const currentUser = localStorage.getItem('qualishel_current_user');
    
    // VALIDAÇÃO CRÍTICA: Verificar se o userId corresponde ao usuário atual
    if (currentUser && userId !== currentUser.toLowerCase().replace(/\s+/g, '_')) {
        console.error(`❌ ERRO CRÍTICO: Tentativa de salvar com userId incorreto! userId: ${userId}, currentUser: ${currentUser}`);
        return false;
    }
    
    console.log(`💾 Salvando ${demands.length} demandas no Firebase para userId: ${userId} (usuário: ${currentUser})`);
    
    if (firebaseInitialized && db) {
        try {
            const { setDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const docRef = doc(db, 'users', userId, 'data', 'demands');
            console.log(`📂 Caminho do documento: users/${userId}/data/demands`);
            await setDoc(docRef, {
                demands: demands,
                counter: counter,
                lastUpdate: new Date().toISOString(),
                userId: userId // Adicionar userId ao documento para validação
            });
            console.log(`✅ Demandas salvas no Firebase para usuário: ${userId}`);
            return true;
        } catch (error) {
            console.error(`❌ Erro ao salvar no Firebase para usuário ${userId}:`, error);
            // Fallback para localStorage
            return saveDemandsToLocalStorage(demands, counter);
        }
    } else {
        return saveDemandsToLocalStorage(demands, counter);
    }
}

// Função para carregar demandas (usa Firebase se disponível, senão localStorage)
async function loadDemandsFromStorage() {
    const userId = getCurrentUserId();
    console.log(`🔍 Carregando demandas do Firebase para userId: ${userId}`);
    
    if (firebaseInitialized && db) {
        try {
            const { getDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const docRef = doc(db, 'users', userId, 'data', 'demands');
            console.log(`📂 Caminho do documento: users/${userId}/data/demands`);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const data = docSnap.data();
                const demandsCount = data.demands ? data.demands.length : 0;
                console.log(`✅ Demandas carregadas do Firebase para usuário ${userId}: ${demandsCount} demandas`);
                return {
                    demands: data.demands || [],
                    counter: data.counter || 1
                };
            }
            console.log(`ℹ️ Nenhuma demanda encontrada no Firebase para usuário: ${userId}`);
            return { demands: [], counter: 1 };
        } catch (error) {
            console.error(`❌ Erro ao carregar do Firebase para usuário ${userId}:`, error);
            // Fallback para localStorage
            return loadDemandsFromLocalStorage();
        }
    } else {
        console.log(`ℹ️ Firebase não inicializado, usando localStorage`);
        return loadDemandsFromLocalStorage();
    }
}

// Funções de fallback para localStorage
function saveDemandsToLocalStorage(demands, counter) {
    try {
        const userId = getCurrentUserId();
        localStorage.setItem(`qualishel-demands-${userId}`, JSON.stringify(demands));
        localStorage.setItem(`qualishel-demand-counter-${userId}`, counter.toString());
        return true;
    } catch (error) {
        console.error('Erro ao salvar no localStorage:', error);
        return false;
    }
}

function loadDemandsFromLocalStorage() {
    try {
        const userId = getCurrentUserId();
        console.log(`🔍 Buscando demandas no localStorage com chave: qualishel-demands-${userId}`);
        
        // Limpar dados antigos (chaves sem userId) se existirem
        const oldKeys = ['qualishel-demands', 'qualishel-demand-counter', 'qualishel-people'];
        oldKeys.forEach(key => {
            if (localStorage.getItem(key)) {
                console.log(`🧹 Removendo chave antiga: ${key}`);
                localStorage.removeItem(key);
            }
        });
        
        const saved = localStorage.getItem(`qualishel-demands-${userId}`);
        const counter = localStorage.getItem(`qualishel-demand-counter-${userId}`);
        
        if (saved) {
            console.log(`✅ Demandas encontradas no localStorage para usuário ${userId}`);
        } else {
            console.log(`ℹ️ Nenhuma demanda encontrada no localStorage para usuário ${userId}`);
        }
        
        return {
            demands: saved ? JSON.parse(saved) : [],
            counter: counter ? parseInt(counter) : 1
        };
    } catch (error) {
        console.error('Erro ao carregar do localStorage:', error);
        return { demands: [], counter: 1 };
    }
}

// Salvar pessoas disponíveis
async function savePeopleToStorage(people) {
    const userId = getCurrentUserId();
    
    if (firebaseInitialized && db) {
        try {
            const { setDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            await setDoc(doc(db, 'users', userId, 'data', 'people'), {
                people: people,
                lastUpdate: new Date().toISOString()
            });
            return true;
        } catch (error) {
            console.error('Erro ao salvar pessoas no Firebase:', error);
            localStorage.setItem(`qualishel-people-${userId}`, JSON.stringify(people));
            return false;
        }
    } else {
        localStorage.setItem(`qualishel-people-${userId}`, JSON.stringify(people));
        return true;
    }
}

// Carregar pessoas disponíveis
async function loadPeopleFromStorage() {
    const userId = getCurrentUserId();
    
    if (firebaseInitialized && db) {
        try {
            const { getDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const docSnap = await getDoc(doc(db, 'users', userId, 'data', 'people'));
            
            if (docSnap.exists()) {
                return docSnap.data().people || [];
            }
            return [];
        } catch (error) {
            console.error('Erro ao carregar pessoas do Firebase:', error);
            const saved = localStorage.getItem(`qualishel-people-${userId}`);
            return saved ? JSON.parse(saved) : [];
        }
    } else {
        // Limpar chave antiga se existir
        if (localStorage.getItem('qualishel-people')) {
            console.log(`🧹 Removendo chave antiga: qualishel-people`);
            localStorage.removeItem('qualishel-people');
        }
        
        const saved = localStorage.getItem(`qualishel-people-${userId}`);
        return saved ? JSON.parse(saved) : [];
    }
}

// Salvar configurações
async function saveConfigToStorage(config) {
    if (firebaseInitialized && db) {
        try {
            const { setDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            await setDoc(doc(db, 'system', 'config'), {
                emailConfig: config.emailConfig || {},
                userName: config.userName || '',
                lastUpdate: new Date().toISOString()
            });
            return true;
        } catch (error) {
            console.error('Erro ao salvar configurações no Firebase:', error);
            if (config.emailConfig) {
                localStorage.setItem('qualishel-email-config', JSON.stringify(config.emailConfig));
            }
            if (config.userName) {
                localStorage.setItem('qualishel-user-name', config.userName);
            }
            return false;
        }
    } else {
        if (config.emailConfig) {
            localStorage.setItem('qualishel-email-config', JSON.stringify(config.emailConfig));
        }
        if (config.userName) {
            localStorage.setItem('qualishel-user-name', config.userName);
        }
        return true;
    }
}

// Carregar configurações
async function loadConfigFromStorage() {
    if (firebaseInitialized && db) {
        try {
            const { getDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const docSnap = await getDoc(doc(db, 'system', 'config'));
            
            if (docSnap.exists()) {
                const data = docSnap.data();
                return {
                    emailConfig: data.emailConfig || {},
                    userName: data.userName || ''
                };
            }
            return { emailConfig: {}, userName: '' };
        } catch (error) {
            console.error('Erro ao carregar configurações do Firebase:', error);
            return loadConfigFromLocalStorage();
        }
    } else {
        return loadConfigFromLocalStorage();
    }
}

function loadConfigFromLocalStorage() {
    const emailConfig = localStorage.getItem('qualishel-email-config');
    const userName = localStorage.getItem('qualishel-user-name');
    return {
        emailConfig: emailConfig ? JSON.parse(emailConfig) : {},
        userName: userName || ''
    };
}

// Salvar painéis
async function savePanelsToStorage(panels, counter, currentPanelId) {
    const userId = getCurrentUserId();
    const currentUser = localStorage.getItem('qualishel_current_user');
    
    // VALIDAÇÃO CRÍTICA: Verificar se o userId corresponde ao usuário atual
    if (currentUser && userId !== currentUser.toLowerCase().replace(/\s+/g, '_')) {
        console.error(`❌ ERRO CRÍTICO: Tentativa de salvar painéis com userId incorreto! userId: ${userId}, currentUser: ${currentUser}`);
        return false;
    }
    
    console.log(`💾 Salvando ${panels.length} painéis no Firebase para userId: ${userId} (usuário: ${currentUser})`);
    
    if (firebaseInitialized && db) {
        try {
            const { setDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const docRef = doc(db, 'users', userId, 'data', 'panels');
            console.log(`📂 Caminho do documento: users/${userId}/data/panels`);
            await setDoc(docRef, {
                panels: panels,
                counter: counter,
                currentPanelId: currentPanelId || null,
                lastUpdate: new Date().toISOString(),
                userId: userId // Adicionar userId ao documento para validação
            });
            console.log(`✅ Painéis salvos no Firebase para usuário: ${userId}`);
            return true;
        } catch (error) {
            console.error(`❌ Erro ao salvar painéis no Firebase para usuário ${userId}:`, error);
            // Fallback para localStorage
            return savePanelsToLocalStorage(panels, counter, currentPanelId);
        }
    } else {
        return savePanelsToLocalStorage(panels, counter, currentPanelId);
    }
}

// Carregar painéis
async function loadPanelsFromStorage() {
    const userId = getCurrentUserId();
    console.log(`🔍 Carregando painéis do Firebase para userId: ${userId}`);
    
    if (firebaseInitialized && db) {
        try {
            const { getDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const docRef = doc(db, 'users', userId, 'data', 'panels');
            console.log(`📂 Caminho do documento: users/${userId}/data/panels`);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const data = docSnap.data();
                const panelsCount = data.panels ? data.panels.length : 0;
                console.log(`✅ Painéis carregados do Firebase para usuário ${userId}: ${panelsCount} painéis`);
                return {
                    panels: data.panels || [],
                    counter: data.counter || 1,
                    currentPanelId: data.currentPanelId || null
                };
            }
            console.log(`ℹ️ Nenhum painel encontrado no Firebase para usuário: ${userId}`);
            return { panels: [], counter: 1, currentPanelId: null };
        } catch (error) {
            console.error(`❌ Erro ao carregar painéis do Firebase para usuário ${userId}:`, error);
            // Fallback para localStorage
            return loadPanelsFromLocalStorage();
        }
    } else {
        console.log(`ℹ️ Firebase não inicializado, usando localStorage`);
        return loadPanelsFromLocalStorage();
    }
}

// Funções de fallback para localStorage (painéis)
function savePanelsToLocalStorage(panels, counter, currentPanelId) {
    try {
        const userId = getCurrentUserId();
        localStorage.setItem(`qualishel-panels-${userId}`, JSON.stringify(panels));
        localStorage.setItem(`qualishel-panel-counter-${userId}`, counter.toString());
        localStorage.setItem(`qualishel-current-panel-${userId}`, currentPanelId ? currentPanelId.toString() : '');
        return true;
    } catch (error) {
        console.error('Erro ao salvar painéis no localStorage:', error);
        return false;
    }
}

function loadPanelsFromLocalStorage() {
    try {
        const userId = getCurrentUserId();
        console.log(`🔍 Buscando painéis no localStorage com chave: qualishel-panels-${userId}`);
        
        // Limpar dados antigos (chaves sem userId) se existirem
        const oldKeys = ['qualishel-panels', 'qualishel-panel-counter', 'qualishel-current-panel'];
        oldKeys.forEach(key => {
            if (localStorage.getItem(key)) {
                console.log(`🧹 Removendo chave antiga: ${key}`);
                localStorage.removeItem(key);
            }
        });
        
        const saved = localStorage.getItem(`qualishel-panels-${userId}`);
        const counter = localStorage.getItem(`qualishel-panel-counter-${userId}`);
        const currentPanel = localStorage.getItem(`qualishel-current-panel-${userId}`);
        
        if (saved) {
            console.log(`✅ Painéis encontrados no localStorage para usuário ${userId}`);
        } else {
            console.log(`ℹ️ Nenhum painel encontrado no localStorage para usuário ${userId}`);
        }
        
        return {
            panels: saved ? JSON.parse(saved) : [],
            counter: counter ? parseInt(counter) : 1,
            currentPanelId: currentPanel ? parseInt(currentPanel) : null
        };
    } catch (error) {
        console.error('Erro ao carregar painéis do localStorage:', error);
        return { panels: [], counter: 1, currentPanelId: null };
    }
}

// Listeners em tempo real para sincronização automática
let unsubscribeDemands = null;
let unsubscribePanels = null;
let unsubscribePeople = null;

// Configurar listener em tempo real para demandas
async function setupRealtimeDemandsListener(callback) {
    if (firebaseInitialized && db) {
        try {
            // Remover listener anterior se existir
            if (unsubscribeDemands) {
                unsubscribeDemands();
            }
            
            const userId = getCurrentUserId();
            const { onSnapshot, doc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            
            unsubscribeDemands = onSnapshot(
                doc(db, 'users', userId, 'data', 'demands'),
                (docSnap) => {
                    // VALIDAÇÃO: Verificar se o userId do documento corresponde ao usuário atual
                    const currentUser = localStorage.getItem('qualishel_current_user');
                    const expectedUserId = currentUser ? currentUser.toLowerCase().replace(/\s+/g, '_') : userId;
                    
                    if (userId !== expectedUserId) {
                        console.warn(`⚠️ Listener recebeu dados de userId diferente! Esperado: ${expectedUserId}, Recebido: ${userId}. Ignorando...`);
                        return;
                    }
                    
                    // Sempre acionar callback, mesmo se documento não existir
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        // Validação adicional: verificar se o documento tem userId e corresponde
                        if (data.userId && data.userId !== userId) {
                            console.warn(`⚠️ Documento tem userId diferente! Esperado: ${userId}, Documento: ${data.userId}. Ignorando...`);
                            return;
                        }
                        console.log(`🔄 Demandas atualizadas em tempo real para userId: ${userId}`, {
                            timestamp: data.lastUpdate || 'sem timestamp',
                            count: (data.demands || []).length
                        });
                        if (callback) {
                            callback({
                                demands: data.demands || [],
                                counter: data.counter || 1
                            });
                        }
                    } else {
                        // Documento não existe ainda - notificar com dados vazios
                        console.log(`ℹ️ Documento de demandas ainda não existe no Firestore para userId: ${userId}`);
                        if (callback) {
                            callback({
                                demands: [],
                                counter: 1
                            });
                        }
                    }
                },
                (error) => {
                    console.error('❌ Erro no listener de demandas:', error);
                    // Tentar reconectar após 3 segundos
                    setTimeout(() => {
                        console.log('🔄 Tentando reconectar listener de demandas...');
                        setupRealtimeDemandsListener(callback);
                    }, 3000);
                }
            );
            console.log('✅ Listener de demandas configurado');
            return true;
        } catch (error) {
            console.error('Erro ao configurar listener de demandas:', error);
            return false;
        }
    }
    return false;
}

// Configurar listener em tempo real para painéis
async function setupRealtimePanelsListener(callback) {
    if (firebaseInitialized && db) {
        try {
            // Remover listener anterior se existir
            if (unsubscribePanels) {
                unsubscribePanels();
            }
            
            const userId = getCurrentUserId();
            const { onSnapshot, doc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            
            unsubscribePanels = onSnapshot(
                doc(db, 'users', userId, 'data', 'panels'),
                (docSnap) => {
                    // VALIDAÇÃO: Verificar se o userId do documento corresponde ao usuário atual
                    const currentUser = localStorage.getItem('qualishel_current_user');
                    const expectedUserId = currentUser ? currentUser.toLowerCase().replace(/\s+/g, '_') : userId;
                    
                    if (userId !== expectedUserId) {
                        console.warn(`⚠️ Listener recebeu dados de userId diferente! Esperado: ${expectedUserId}, Recebido: ${userId}. Ignorando...`);
                        return;
                    }
                    
                    // Sempre acionar callback, mesmo se documento não existir
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        // Validação adicional: verificar se o documento tem userId e corresponde
                        if (data.userId && data.userId !== userId) {
                            console.warn(`⚠️ Documento tem userId diferente! Esperado: ${userId}, Documento: ${data.userId}. Ignorando...`);
                            return;
                        }
                        console.log(`🔄 Painéis atualizados em tempo real para userId: ${userId}`, {
                            timestamp: data.lastUpdate || 'sem timestamp',
                            count: (data.panels || []).length,
                            currentPanelId: data.currentPanelId
                        });
                        if (callback) {
                            callback({
                                panels: data.panels || [],
                                counter: data.counter || 1,
                                currentPanelId: data.currentPanelId || null
                            });
                        }
                    } else {
                        // Documento não existe ainda - notificar com dados vazios
                        console.log(`ℹ️ Documento de painéis ainda não existe no Firestore para userId: ${userId}`);
                        if (callback) {
                            callback({
                                panels: [],
                                counter: 1,
                                currentPanelId: null
                            });
                        }
                    }
                },
                (error) => {
                    console.error('❌ Erro no listener de painéis:', error);
                    // Tentar reconectar após 3 segundos
                    setTimeout(() => {
                        console.log('🔄 Tentando reconectar listener de painéis...');
                        setupRealtimePanelsListener(callback);
                    }, 3000);
                }
            );
            console.log('✅ Listener de painéis configurado');
            return true;
        } catch (error) {
            console.error('Erro ao configurar listener de painéis:', error);
            return false;
        }
    }
    return false;
}

// Configurar listener em tempo real para pessoas
async function setupRealtimePeopleListener(callback) {
    if (firebaseInitialized && db) {
        try {
            // Remover listener anterior se existir
            if (unsubscribePeople) {
                unsubscribePeople();
            }
            
            const userId = getCurrentUserId();
            const { onSnapshot, doc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            
            unsubscribePeople = onSnapshot(
                doc(db, 'users', userId, 'data', 'people'),
                (docSnap) => {
                    // Sempre acionar callback, mesmo se documento não existir
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        console.log('🔄 Pessoas atualizadas em tempo real', {
                            timestamp: data.lastUpdate || 'sem timestamp',
                            count: (data.people || []).length
                        });
                        if (callback) {
                            callback(data.people || []);
                        }
                    } else {
                        // Documento não existe ainda - notificar com dados vazios
                        console.log('ℹ️ Documento de pessoas ainda não existe no Firestore');
                        if (callback) {
                            callback([]);
                        }
                    }
                },
                (error) => {
                    console.error('❌ Erro no listener de pessoas:', error);
                    // Tentar reconectar após 3 segundos
                    setTimeout(() => {
                        console.log('🔄 Tentando reconectar listener de pessoas...');
                        setupRealtimePeopleListener(callback);
                    }, 3000);
                }
            );
            console.log('✅ Listener de pessoas configurado');
            return true;
        } catch (error) {
            console.error('Erro ao configurar listener de pessoas:', error);
            return false;
        }
    }
    return false;
}

// Remover todos os listeners
function removeAllListeners() {
    console.log('🛑 Removendo todos os listeners...');
    if (unsubscribeDemands) {
        unsubscribeDemands();
        unsubscribeDemands = null;
        console.log('✅ Listener de demandas removido');
    }
    if (unsubscribePanels) {
        unsubscribePanels();
        unsubscribePanels = null;
        console.log('✅ Listener de painéis removido');
    }
    if (unsubscribePeople) {
        unsubscribePeople();
        unsubscribePeople = null;
        console.log('✅ Listener de pessoas removido');
    }
    console.log('✅ Todos os listeners foram removidos');
}

// Inicializar quando a página carregar
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        initializeFirebase();
    });
}

// Exportar funções para uso global
if (typeof window !== 'undefined') {
    window.firebaseService = {
        initializeFirebase,
        saveDemandsToStorage,
        loadDemandsFromStorage,
        savePeopleToStorage,
        loadPeopleFromStorage,
        saveConfigToStorage,
        loadConfigFromStorage,
        savePanelsToStorage,
        loadPanelsFromStorage,
        setupRealtimeDemandsListener,
        setupRealtimePanelsListener,
        setupRealtimePeopleListener,
        removeAllListeners,
        checkFirebaseAvailable,
        isInitialized: () => firebaseInitialized,
        getCurrentUserId
    };
}





