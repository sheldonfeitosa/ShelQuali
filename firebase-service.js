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
        checkFirebaseAvailable,
        isInitialized: () => firebaseInitialized
    };
}




