// Serviço Firebase para Qualishel
// Este arquivo gerencia a integração com Firebase Firestore

let firebaseInitialized = false;
let db = null;

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
    if (firebaseInitialized && db) {
        try {
            const { setDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            await setDoc(doc(db, 'system', 'demands'), {
                demands: demands,
                counter: counter,
                lastUpdate: new Date().toISOString()
            });
            console.log('✅ Demandas salvas no Firebase');
            return true;
        } catch (error) {
            console.error('Erro ao salvar no Firebase:', error);
            // Fallback para localStorage
            return saveDemandsToLocalStorage(demands, counter);
        }
    } else {
        return saveDemandsToLocalStorage(demands, counter);
    }
}

// Função para carregar demandas (usa Firebase se disponível, senão localStorage)
async function loadDemandsFromStorage() {
    if (firebaseInitialized && db) {
        try {
            const { getDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const docSnap = await getDoc(doc(db, 'system', 'demands'));
            
            if (docSnap.exists()) {
                const data = docSnap.data();
                console.log('✅ Demandas carregadas do Firebase');
                return {
                    demands: data.demands || [],
                    counter: data.counter || 1
                };
            }
            return { demands: [], counter: 1 };
        } catch (error) {
            console.error('Erro ao carregar do Firebase:', error);
            // Fallback para localStorage
            return loadDemandsFromLocalStorage();
        }
    } else {
        return loadDemandsFromLocalStorage();
    }
}

// Funções de fallback para localStorage
function saveDemandsToLocalStorage(demands, counter) {
    try {
        localStorage.setItem('qualishel-demands', JSON.stringify(demands));
        localStorage.setItem('qualishel-demand-counter', counter.toString());
        return true;
    } catch (error) {
        console.error('Erro ao salvar no localStorage:', error);
        return false;
    }
}

function loadDemandsFromLocalStorage() {
    try {
        const saved = localStorage.getItem('qualishel-demands');
        const counter = localStorage.getItem('qualishel-demand-counter');
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
    if (firebaseInitialized && db) {
        try {
            const { setDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            await setDoc(doc(db, 'system', 'people'), {
                people: people,
                lastUpdate: new Date().toISOString()
            });
            return true;
        } catch (error) {
            console.error('Erro ao salvar pessoas no Firebase:', error);
            localStorage.setItem('qualishel-people', JSON.stringify(people));
            return false;
        }
    } else {
        localStorage.setItem('qualishel-people', JSON.stringify(people));
        return true;
    }
}

// Carregar pessoas disponíveis
async function loadPeopleFromStorage() {
    if (firebaseInitialized && db) {
        try {
            const { getDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const docSnap = await getDoc(doc(db, 'system', 'people'));
            
            if (docSnap.exists()) {
                return docSnap.data().people || [];
            }
            return [];
        } catch (error) {
            console.error('Erro ao carregar pessoas do Firebase:', error);
            const saved = localStorage.getItem('qualishel-people');
            return saved ? JSON.parse(saved) : [];
        }
    } else {
        const saved = localStorage.getItem('qualishel-people');
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
    if (firebaseInitialized && db) {
        try {
            const { setDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            await setDoc(doc(db, 'system', 'panels'), {
                panels: panels,
                counter: counter,
                currentPanelId: currentPanelId || null,
                lastUpdate: new Date().toISOString()
            });
            console.log('✅ Painéis salvos no Firebase');
            return true;
        } catch (error) {
            console.error('Erro ao salvar painéis no Firebase:', error);
            // Fallback para localStorage
            return savePanelsToLocalStorage(panels, counter, currentPanelId);
        }
    } else {
        return savePanelsToLocalStorage(panels, counter, currentPanelId);
    }
}

// Carregar painéis
async function loadPanelsFromStorage() {
    if (firebaseInitialized && db) {
        try {
            const { getDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const docSnap = await getDoc(doc(db, 'system', 'panels'));
            
            if (docSnap.exists()) {
                const data = docSnap.data();
                console.log('✅ Painéis carregados do Firebase');
                return {
                    panels: data.panels || [],
                    counter: data.counter || 1,
                    currentPanelId: data.currentPanelId || null
                };
            }
            return { panels: [], counter: 1, currentPanelId: null };
        } catch (error) {
            console.error('Erro ao carregar painéis do Firebase:', error);
            // Fallback para localStorage
            return loadPanelsFromLocalStorage();
        }
    } else {
        return loadPanelsFromLocalStorage();
    }
}

// Funções de fallback para localStorage (painéis)
function savePanelsToLocalStorage(panels, counter, currentPanelId) {
    try {
        localStorage.setItem('qualishel-panels', JSON.stringify(panels));
        localStorage.setItem('qualishel-panel-counter', counter.toString());
        localStorage.setItem('qualishel-current-panel', currentPanelId ? currentPanelId.toString() : '');
        return true;
    } catch (error) {
        console.error('Erro ao salvar painéis no localStorage:', error);
        return false;
    }
}

function loadPanelsFromLocalStorage() {
    try {
        const saved = localStorage.getItem('qualishel-panels');
        const counter = localStorage.getItem('qualishel-panel-counter');
        const currentPanel = localStorage.getItem('qualishel-current-panel');
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
            
            const { onSnapshot, doc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            
            unsubscribeDemands = onSnapshot(
                doc(db, 'system', 'demands'),
                (docSnap) => {
                    // Sempre acionar callback, mesmo se documento não existir
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        console.log('🔄 Demandas atualizadas em tempo real', {
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
                        console.log('ℹ️ Documento de demandas ainda não existe no Firestore');
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
            
            const { onSnapshot, doc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            
            unsubscribePanels = onSnapshot(
                doc(db, 'system', 'panels'),
                (docSnap) => {
                    // Sempre acionar callback, mesmo se documento não existir
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        console.log('🔄 Painéis atualizados em tempo real', {
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
                        console.log('ℹ️ Documento de painéis ainda não existe no Firestore');
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
            
            const { onSnapshot, doc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            
            unsubscribePeople = onSnapshot(
                doc(db, 'system', 'people'),
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
    if (unsubscribeDemands) {
        unsubscribeDemands();
        unsubscribeDemands = null;
    }
    if (unsubscribePanels) {
        unsubscribePanels();
        unsubscribePanels = null;
    }
    if (unsubscribePeople) {
        unsubscribePeople();
        unsubscribePeople = null;
    }
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
        isInitialized: () => firebaseInitialized
    };
}





