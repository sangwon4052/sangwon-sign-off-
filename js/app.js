// ===================================================================
// 온라인 결재 시스템 v2.0.0 - Firebase 버전
// 모든 데이터는 Firebase Firestore에 저장되어 여러 PC에서 공유됩니다
// ===================================================================

// Firebase Firestore import
import { 
    collection, 
    getDocs, 
    getDoc,
    doc, 
    addDoc, 
    updateDoc, 
    deleteDoc,
    query,
    where,
    orderBy,
    limit as firestoreLimit
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// ===== 전역 상태 =====
let currentUser = null;
let autoRefreshInterval = null;
let currentPage = 'dashboard';
const db = window.db;

// ===== Firestore 헬퍼 함수 =====
const DB = {
    // 컬렉션의 모든 문서 가져오기
    async getAll(collectionName) {
        try {
            const querySnapshot = await getDocs(collection(db, collectionName));
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error(`❌ ${collectionName} 조회 오류:`, error);
            throw error;
        }
    },

    // 특정 문서 가져오기
    async getById(collectionName, id) {
        try {
            const docRef = doc(db, collectionName, id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() };
            }
            return null;
        } catch (error) {
            console.error(`❌ ${collectionName}/${id} 조회 오류:`, error);
            throw error;
        }
    },

    // 문서 생성
    async create(collectionName, data) {
        try {
            const docRef = await addDoc(collection(db, collectionName), {
                ...data,
                createdAt: data.createdAt || new Date().toISOString()
            });
            return { id: docRef.id, ...data };
        } catch (error) {
            console.error(`❌ ${collectionName} 생성 오류:`, error);
            throw error;
        }
    },

    // 문서 업데이트
    async update(collectionName, id, data) {
        try {
            const docRef = doc(db, collectionName, id);
            await updateDoc(docRef, data);
            return { id, ...data };
        } catch (error) {
            console.error(`❌ ${collectionName}/${id} 업데이트 오류:`, error);
            throw error;
        }
    },

    // 문서 삭제
    async delete(collectionName, id) {
        try {
            await deleteDoc(doc(db, collectionName, id));
        } catch (error) {
            console.error(`❌ ${collectionName}/${id} 삭제 오류:`, error);
            throw error;
        }
    },

    // 조건 쿼리
    async query(collectionName, conditions) {
        try {
            let q = collection(db, collectionName);
            const querySnapshot = await getDocs(q);
            let results = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            // 클라이언트 사이드 필터링
            if (conditions) {
                Object.keys(conditions).forEach(key => {
                    results = results.filter(item => item[key] === conditions[key]);
                });
            }
            
            return results;
        } catch (error) {
            console.error(`❌ ${collectionName} 쿼리 오류:`, error);
            throw error;
        }
    }
};

// ===== 초기화 =====
async function initializeApp() {
    console.log('🚀 앱 초기화 시작...');
    
    try {
        // 기본 관리자 계정 확인 및 생성
        const users = await DB.getAll('users');
        console.log('👥 기존 사용자 수:', users.length);
        
        if (users.length === 0) {
            console.log('👤 기본 관리자 계정 생성 중...');
            const adminUser = {
                name: '관리자',
                email: 'admin@company.com',
                password: 'admin123',
                role: 'admin',
                status: 'approved',
                createdAt: new Date().toISOString()
            };
            
            await DB.create('users', adminUser);
            console.log('✅ 기본 관리자 계정 생성 완료');
            showToast('시스템이 초기화되었습니다', 'success');
        }
        
        // 저장된 세션 확인
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            currentUser = JSON.parse(savedUser);
            console.log('💾 저장된 세션 발견:', currentUser.email);
            showDashboard();
        } else {
            showLoginPage();
        }
        
    } catch (error) {
        console.error('❌ 초기화 오류:', error);
        showToast('시스템 초기화 중 오류가 발생했습니다', 'error');
        showLoginPage();
    }
}

// ===== 페이지 전환 =====
function showLoginPage() {
    document.getElementById('loginPage').style.display = 'block';
    document.getElementById('signupPage').style.display = 'none';
    document.getElementById('mainApp').style.display = 'none';
}

function showSignupPage() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('signupPage').style.display = 'block';
    document.getElementById('mainApp').style.display = 'none';
}

function showDashboard() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('signupPage').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    
    updateUserInfo();
    navigateToPage('dashboard');
    startAutoRefresh();
}

function updateUserInfo() {
    if (!currentUser) return;
    
    const userName = document.getElementById('navbarUserName');
    const userRole = document.getElementById('navbarUserRole');
    
    if (userName) userName.textContent = currentUser.name;
    if (userRole) userRole.textContent = getRoleText(currentUser.role);
    
    updateSidebarForRole();
}

function updateSidebarForRole() {
    const role = currentUser?.role;
    
    // 모든 역할별 메뉴 숨기기
    document.querySelectorAll('.requester-menu').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.approver-menu').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.admin-menu').forEach(el => el.style.display = 'none');
    
    // 현재 역할에 맞는 메뉴 표시
    if (role === 'admin') {
        document.querySelectorAll('.admin-menu').forEach(el => el.style.display = 'flex');
        document.querySelectorAll('.approver-menu').forEach(el => el.style.display = 'flex');
        document.querySelectorAll('.requester-menu').forEach(el => el.style.display = 'flex');
    } else if (role === 'approver') {
        document.querySelectorAll('.approver-menu').forEach(el => el.style.display = 'flex');
        document.querySelectorAll('.requester-menu').forEach(el => el.style.display = 'flex');
    } else if (role === 'requester') {
        document.querySelectorAll('.requester-menu').forEach(el => el.style.display = 'flex');
    }
}

// ===== 로그인 =====
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe')?.checked || false;
    
    if (!email || !password) {
        showToast('이메일과 비밀번호를 입력해주세요', 'error');
        return;
    }
    
    try {
        console.log('🔐 로그인 시도:', email);
        
        // Firestore에서 모든 사용자 조회
        const users = await DB.getAll('users');
        console.log('👥 조회된 사용자 수:', users.length);
        
        // 이메일과 비밀번호로 사용자 찾기
        const user = users.find(u => u.email === email && u.password === password);
        
        if (!user) {
            showToast('이메일 또는 비밀번호가 올바르지 않습니다', 'error');
            return;
        }
        
        if (user.status !== 'approved') {
            showToast('가입 승인 대기 중입니다', 'warning');
            return;
        }
        
        // 아이디 기억하기
        if (rememberMe) {
            localStorage.setItem('savedEmail', email);
        } else {
            localStorage.removeItem('savedEmail');
        }
        
        // 로그인 성공
        currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        console.log('✅ 로그인 성공:', user.email);
        showToast(`환영합니다, ${user.name}님!`, 'success');
        showDashboard();
        
    } catch (error) {
        console.error('❌ 로그인 오류:', error);
        showToast('로그인 처리 중 오류가 발생했습니다', 'error');
    }
}

// ===== 회원가입 =====
async function handleSignup(e) {
    e.preventDefault();
    
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const role = document.getElementById('signupRole').value;
    
    // 유효성 검사
    if (!name || !email || !password || !role) {
        showToast('모든 필드를 입력해주세요', 'error');
        return;
    }
    
    if (password.length < 6) {
        showToast('비밀번호는 최소 6자 이상이어야 합니다', 'error');
        return;
    }
    
    try {
        console.log('📝 회원가입 시도:', email);
        
        // 중복 확인
        const users = await DB.getAll('users');
        const pendingUsers = await DB.getAll('pendingUsers');
        
        const existingUser = users.find(u => u.email === email);
        const existingPending = pendingUsers.find(u => u.email === email);
        
        if (existingUser || existingPending) {
            showToast('이미 사용 중인 이메일입니다', 'error');
            return;
        }
        
        // 가입 대기 사용자 생성
        const newPendingUser = {
            name,
            email,
            password,
            role,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        
        await DB.create('pendingUsers', newPendingUser);
        
        console.log('✅ 회원가입 신청 완료:', email);
        showToast('회원가입 신청이 완료되었습니다. 관리자 승인을 기다려주세요.', 'success');
        
        // 폼 초기화 및 로그인 페이지로 이동
        document.getElementById('signupForm').reset();
        setTimeout(() => showLoginPage(), 2000);
        
    } catch (error) {
        console.error('❌ 회원가입 오류:', error);
        showToast('회원가입 처리 중 오류가 발생했습니다', 'error');
    }
}

// ===== 로그아웃 =====
function handleLogout() {
    stopAutoRefresh();
    currentUser = null;
    localStorage.removeItem('currentUser');
    
    console.log('👋 로그아웃');
    showToast('로그아웃 되었습니다', 'success');
    showLoginPage();
}

// ===== 페이지 네비게이션 =====
function navigateToPage(page) {
    const pages = ['dashboard', 'myRequests', 'newRequest', 'pendingApprovals', 
                   'approvalHistory', 'employeeRegistration', 'pendingUsers', 'userManagement'];
    
    pages.forEach(p => {
        const el = document.getElementById(p + 'Page');
        if (el) el.style.display = 'none';
    });
    
    const targetPage = document.getElementById(page + 'Page');
    if (targetPage) {
        targetPage.style.display = 'block';
        currentPage = page;
    }
    
    // 사이드바 활성화 상태 업데이트
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    const activeItem = document.querySelector(`.menu-item[data-page="${page}"]`);
    if (activeItem) activeItem.classList.add('active');
    
    // 페이지별 데이터 로드
    loadPageData(page);
}

async function loadPageData(page) {
    try {
        switch(page) {
            case 'dashboard':
                await loadDashboard();
                break;
            case 'myRequests':
                await loadMyRequests();
                break;
            case 'newRequest':
                await loadNewRequestPage();
                break;
            case 'pendingApprovals':
                await loadPendingApprovals();
                break;
            case 'approvalHistory':
                await loadApprovalHistory();
                break;
            case 'employeeRegistration':
                await loadEmployeeRegistration();
                break;
            case 'pendingUsers':
                await loadPendingUsers();
                break;
            case 'userManagement':
                await loadUserManagement();
                break;
        }
    } catch (error) {
        console.error('❌ 페이지 데이터 로드 오류:', error);
    }
}

// ===== 대시보드 =====
async function loadDashboard() {
    const dashboardContent = document.getElementById('dashboardContent');
    if (!dashboardContent) return;
    
    const role = currentUser.role;
    
    dashboardContent.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <i class="fas fa-user-circle"></i>
                <div>
                    <h3>환영합니다!</h3>
                    <p>${currentUser.name}님</p>
                </div>
            </div>
            <div class="stat-card">
                <i class="fas fa-shield-alt"></i>
                <div>
                    <h3>역할</h3>
                    <p>${getRoleText(role)}</p>
                </div>
            </div>
        </div>
        <div style="background: white; padding: 30px; border-radius: 12px; text-align: center;">
            <i class="fas fa-check-circle" style="font-size: 48px; color: var(--success); margin-bottom: 20px;"></i>
            <h3 style="margin-bottom: 10px;">🔥 Firebase 연결 성공!</h3>
            <p style="color: var(--text-secondary);">모든 PC에서 데이터가 실시간으로 공유됩니다.</p>
            <p style="color: var(--text-secondary); margin-top: 10px;">좌측 메뉴에서 원하는 기능을 선택하세요.</p>
        </div>
    `;
}

// ===== 내 결재 신청 =====
async function loadMyRequests() {
    const listEl = document.getElementById('myRequestsList');
    if (!listEl) return;
    
    try {
        const approvals = await DB.getAll('approvals');
        const myApprovals = approvals.filter(a => a.requesterId === currentUser.id);
        
        if (myApprovals.length === 0) {
            listEl.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">신청한 결재가 없습니다.</p>';
            return;
        }
        
        // 최신순으로 정렬
        myApprovals.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        listEl.innerHTML = myApprovals.map(approval => `
            <div class="user-card">
                <div>
                    <h4>${approval.title}</h4>
                    <p>${approval.description}</p>
                    <p style="font-size: 13px; color: var(--text-secondary); margin-top: 4px;">
                        <i class="far fa-clock"></i> 신청일: ${new Date(approval.createdAt).toLocaleString('ko-KR')}
                    </p>
                    ${approval.processedAt ? `
                        <p style="font-size: 13px; color: var(--text-secondary); margin-top: 2px;">
                            <i class="far fa-check-circle"></i> 처리일: ${new Date(approval.processedAt).toLocaleString('ko-KR')}
                        </p>
                    ` : ''}
                    <span class="badge badge-${approval.status}">${getStatusText(approval.status)}</span>
                </div>
                <div class="user-actions">
                    <button class="btn btn-sm btn-primary" onclick="window.viewApprovalDetail('${approval.id}')">
                        <i class="fas fa-eye"></i> 상세보기
                    </button>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('❌ 내 결재 신청 로드 오류:', error);
        listEl.innerHTML = '<p style="color: var(--danger);">데이터를 불러오는 중 오류가 발생했습니다.</p>';
    }
}

// ===== 새 결재 요청 =====
async function loadNewRequestPage() {
    const approverSelect = document.getElementById('assignedApprover');
    if (!approverSelect) return;
    
    try {
        const users = await DB.getAll('users');
        const approvers = users.filter(u => (u.role === 'approver' || u.role === 'admin') && u.status === 'approved');
        
        approverSelect.innerHTML = '<option value="">결재자를 선택하세요</option>' +
            approvers.map(a => `<option value="${a.id}">${a.name} (${a.email})</option>`).join('');
            
    } catch (error) {
        console.error('❌ 결재자 목록 로드 오류:', error);
    }
}

async function handleNewRequest(e) {
    e.preventDefault();
    
    const title = document.getElementById('requestTitle').value.trim();
    const description = document.getElementById('requestDescription').value.trim();
    const assignedApproverId = document.getElementById('assignedApprover').value;
    const filesInput = document.getElementById('requestFiles');
    
    if (!title || !description || !assignedApproverId) {
        showToast('모든 필수 필드를 입력해주세요', 'error');
        return;
    }
    
    try {
        // 파일 읽기
        const files = [];
        if (filesInput.files.length > 0) {
            for (let i = 0; i < filesInput.files.length; i++) {
                const file = filesInput.files[i];
                const fileData = await readFileAsBase64(file);
                files.push({
                    fileName: file.name,
                    fileData: fileData
                });
            }
        }
        
        // 결재자 정보 가져오기
        const approver = await DB.getById('users', assignedApproverId);
        
        // 결재 생성
        const newApproval = {
            title,
            description,
            requesterId: currentUser.id,
            requesterName: currentUser.name,
            assignedApproverId,
            assignedApproverName: approver.name,
            status: 'pending',
            files: files,
            signedFiles: [],
            feedback: '',
            createdAt: new Date().toISOString(),
            processedAt: null,
            processedBy: null
        };
        
        await DB.create('approvals', newApproval);
        
        console.log('✅ 결재 요청 완료');
        showToast('결재 요청이 완료되었습니다', 'success');
        
        // 폼 초기화
        document.getElementById('newRequestForm').reset();
        document.getElementById('filePreviewList').innerHTML = '';
        
        // 내 결재 신청 페이지로 이동
        setTimeout(() => navigateToPage('myRequests'), 1000);
        
    } catch (error) {
        console.error('❌ 결재 요청 오류:', error);
        showToast('결재 요청 중 오류가 발생했습니다', 'error');
    }
}

// 파일을 Base64로 읽기
function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// 파일 선택 시 미리보기
function updateFilePreview() {
    const filesInput = document.getElementById('requestFiles');
    const previewList = document.getElementById('filePreviewList');
    
    if (!filesInput || !previewList) return;
    
    const files = filesInput.files;
    if (files.length === 0) {
        previewList.innerHTML = '';
        return;
    }
    
    previewList.innerHTML = Array.from(files).map(file => `
        <div class="file-item">
            <div class="file-info">
                <i class="fas fa-file-alt"></i>
                <div>
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${formatFileSize(file.size)}</div>
                </div>
            </div>
        </div>
    `).join('');
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// ===== 처리할 결재 =====
async function loadPendingApprovals() {
    const listEl = document.getElementById('pendingApprovalsList');
    if (!listEl) return;
    
    try {
        const approvals = await DB.getAll('approvals');
        const pending = approvals.filter(a => 
            a.assignedApproverId === currentUser.id && a.status === 'pending'
        );
        
        if (pending.length === 0) {
            listEl.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">처리할 결재가 없습니다.</p>';
            return;
        }
        
        listEl.innerHTML = pending.map(approval => `
            <div class="user-card">
                <div>
                    <h4>${approval.title}</h4>
                    <p>신청자: ${approval.requesterName}</p>
                    <p style="font-size: 13px; color: var(--text-secondary);">
                        <i class="far fa-clock"></i> ${new Date(approval.createdAt).toLocaleString('ko-KR')}
                    </p>
                    ${approval.files && approval.files.length > 0 ? `
                        <p style="font-size: 13px; color: var(--primary); margin-top: 4px;">
                            <i class="fas fa-paperclip"></i> 첨부파일 ${approval.files.length}개
                        </p>
                    ` : ''}
                </div>
                <div class="user-actions">
                    <button class="btn btn-sm btn-primary" onclick="window.viewApprovalDetail('${approval.id}')">
                        <i class="fas fa-eye"></i> 상세보기
                    </button>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('❌ 처리할 결재 로드 오류:', error);
        listEl.innerHTML = '<p style="color: var(--danger);">데이터를 불러오는 중 오류가 발생했습니다.</p>';
    }
}

// ===== 처리 완료 =====
async function loadApprovalHistory() {
    const listEl = document.getElementById('approvalHistoryList');
    if (!listEl) return;
    
    try {
        const approvals = await DB.getAll('approvals');
        const history = approvals.filter(a => 
            a.assignedApproverId === currentUser.id && a.status !== 'pending'
        );
        
        if (history.length === 0) {
            listEl.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">처리한 결재가 없습니다.</p>';
            return;
        }
        
        // 처리일 기준 최신순 정렬
        history.sort((a, b) => new Date(b.processedAt) - new Date(a.processedAt));
        
        listEl.innerHTML = history.map(approval => `
            <div class="user-card">
                <div>
                    <h4>${approval.title}</h4>
                    <p>신청자: ${approval.requesterName}</p>
                    <p style="font-size: 13px; color: var(--text-secondary); margin-top: 4px;">
                        <i class="far fa-clock"></i> 신청일: ${new Date(approval.createdAt).toLocaleString('ko-KR')}
                    </p>
                    <p style="font-size: 13px; color: var(--text-secondary); margin-top: 2px;">
                        <i class="far fa-check-circle"></i> 처리일: ${new Date(approval.processedAt).toLocaleString('ko-KR')}
                    </p>
                    <span class="badge badge-${approval.status}">${getStatusText(approval.status)}</span>
                </div>
                <div class="user-actions">
                    <button class="btn btn-sm btn-secondary" onclick="window.viewApprovalDetail('${approval.id}')">
                        <i class="fas fa-eye"></i> 상세보기
                    </button>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('❌ 처리 완료 로드 오류:', error);
        listEl.innerHTML = '<p style="color: var(--danger);">데이터를 불러오는 중 오류가 발생했습니다.</p>';
    }
}

// ===== 결재 상세보기 =====
async function viewApprovalDetail(approvalId) {
    try {
        const approval = await DB.getById('approvals', approvalId);
        const modal = document.getElementById('approvalModal');
        const modalBody = document.getElementById('approvalModalBody');
        
        if (!approval) {
            showToast('결재 정보를 찾을 수 없습니다', 'error');
            return;
        }
        
        // 파일 목록 HTML
        let filesHtml = '';
        if (approval.files && approval.files.length > 0) {
            filesHtml = `
                <div class="detail-section">
                    <h3><i class="fas fa-paperclip"></i> 첨부 파일 (${approval.files.length}개)</h3>
                    <div class="files-list">
                        ${approval.files.map((file, index) => `
                            <div class="file-download-item">
                                <div class="file-download-info">
                                    <i class="fas fa-file-alt"></i>
                                    <div>
                                        <div class="file-name">${file.fileName}</div>
                                    </div>
                                </div>
                                <button class="btn btn-sm btn-primary" onclick="downloadFile('${file.fileData}', '${file.fileName}')">
                                    <i class="fas fa-download"></i> 다운로드
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } else {
            filesHtml = '<div class="detail-section"><p style="color: var(--text-secondary);">첨부 파일이 없습니다.</p></div>';
        }
        
        // 사인 파일 목록 HTML
        let signedFilesHtml = '';
        if (approval.signedFiles && approval.signedFiles.length > 0) {
            signedFilesHtml = `
                <div class="detail-section">
                    <h3><i class="fas fa-file-signature"></i> 사인된 파일 (${approval.signedFiles.length}개)</h3>
                    <div class="files-list">
                        ${approval.signedFiles.map((file, index) => `
                            <div class="file-download-item">
                                <div class="file-download-info">
                                    <i class="fas fa-file-signature"></i>
                                    <div>
                                        <div class="file-name">${file.fileName}</div>
                                    </div>
                                </div>
                                <button class="btn btn-sm btn-success" onclick="downloadFile('${file.fileData}', '${file.fileName}')">
                                    <i class="fas fa-download"></i> 다운로드
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        // 처리 버튼 (결재자이고 pending 상태일 때만)
        let actionsHtml = '';
        if (approval.assignedApproverId === currentUser.id && approval.status === 'pending') {
            actionsHtml = `
                <div class="modal-actions">
                    <button class="btn btn-success" onclick="processApprovalFromModal('${approval.id}', 'approved')">
                        <i class="fas fa-check"></i> 승인
                    </button>
                    <button class="btn btn-danger" onclick="processApprovalFromModal('${approval.id}', 'rejected')">
                        <i class="fas fa-times"></i> 반려
                    </button>
                    <button class="btn btn-secondary" onclick="closeApprovalModal()">
                        <i class="fas fa-arrow-left"></i> 닫기
                    </button>
                </div>
            `;
        } else {
            actionsHtml = `
                <div class="modal-actions">
                    <button class="btn btn-secondary" onclick="closeApprovalModal()">
                        <i class="fas fa-times"></i> 닫기
                    </button>
                </div>
            `;
        }
        
        // 모달 내용 구성
        modalBody.innerHTML = `
            <div class="detail-section">
                <h3><i class="fas fa-info-circle"></i> 기본 정보</h3>
                <div class="detail-item">
                    <div class="detail-label">제목</div>
                    <div class="detail-value">${approval.title}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">신청자</div>
                    <div class="detail-value">${approval.requesterName}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">담당 결재자</div>
                    <div class="detail-value">${approval.assignedApproverName}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">상태</div>
                    <div class="detail-value">
                        <span class="badge badge-${approval.status}">${getStatusText(approval.status)}</span>
                    </div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">신청일시</div>
                    <div class="detail-value">${new Date(approval.createdAt).toLocaleString('ko-KR')}</div>
                </div>
                ${approval.processedAt ? `
                    <div class="detail-item">
                        <div class="detail-label">처리일시</div>
                        <div class="detail-value">${new Date(approval.processedAt).toLocaleString('ko-KR')}</div>
                    </div>
                ` : ''}
            </div>
            
            <div class="detail-section">
                <h3><i class="fas fa-align-left"></i> 내용</h3>
                <div class="detail-value" style="white-space: pre-wrap;">${approval.description}</div>
            </div>
            
            ${filesHtml}
            ${signedFilesHtml}
            
            ${approval.feedback ? `
                <div class="detail-section">
                    <h3><i class="fas fa-comment"></i> 피드백</h3>
                    <div class="detail-value" style="white-space: pre-wrap;">${approval.feedback}</div>
                </div>
            ` : ''}
            
            ${actionsHtml}
        `;
        
        // 모달 표시
        modal.style.display = 'flex';
        
    } catch (error) {
        console.error('❌ 결재 상세 로드 오류:', error);
        showToast('결재 정보를 불러오는 중 오류가 발생했습니다', 'error');
    }
}

// 모달 닫기
function closeApprovalModal() {
    const modal = document.getElementById('approvalModal');
    if (modal) modal.style.display = 'none';
}

// 모달에서 결재 처리
async function processApprovalFromModal(approvalId, status) {
    if (status === 'rejected') {
        // 반려 시 피드백 입력 받기
        showFeedbackModal(approvalId);
    } else {
        // 승인 시 파일 업로드 옵션
        showApprovalModal(approvalId);
    }
}

// 승인 모달 표시 (파일 업로드 옵션)
function showApprovalModal(approvalId) {
    const approvalModal = document.getElementById('approvalModal');
    const modalBody = document.getElementById('approvalModalBody');
    
    modalBody.innerHTML = `
        <div class="detail-section">
            <h3><i class="fas fa-check-circle"></i> 결재 승인</h3>
            <p style="color: var(--text-secondary); margin-bottom: 16px;">
                결재를 승인합니다. 필요한 경우 사인된 파일을 업로드할 수 있습니다.
            </p>
            
            <div class="form-group">
                <label for="signedFiles">사인된 파일 업로드 (선택사항)</label>
                <input type="file" id="signedFiles" multiple accept=".doc,.docx,.hwp,.xls,.xlsx,.pdf">
                <small>여러 파일을 선택할 수 있습니다.</small>
                <div id="signedFilePreview" class="file-preview-list" style="margin-top: 10px;"></div>
            </div>
            
            <div class="form-group">
                <label for="approvalFeedback">피드백 (선택사항)</label>
                <textarea 
                    id="approvalFeedback" 
                    rows="4" 
                    placeholder="승인과 함께 전달할 메시지를 입력하세요..."
                    style="width: 100%; padding: 12px; border: 2px solid var(--border); border-radius: 8px; font-family: 'Noto Sans KR', sans-serif; font-size: 14px;"
                ></textarea>
            </div>
        </div>
        <div class="modal-actions">
            <button class="btn btn-success" onclick="submitApproval('${approvalId}')">
                <i class="fas fa-check"></i> 승인 완료
            </button>
            <button class="btn btn-secondary" onclick="window.viewApprovalDetail('${approvalId}')">
                <i class="fas fa-arrow-left"></i> 돌아가기
            </button>
        </div>
    `;
    
    // 파일 선택 이벤트
    const filesInput = document.getElementById('signedFiles');
    if (filesInput) {
        filesInput.addEventListener('change', updateSignedFilePreview);
    }
}

// 사인 파일 미리보기
function updateSignedFilePreview() {
    const filesInput = document.getElementById('signedFiles');
    const previewList = document.getElementById('signedFilePreview');
    
    if (!filesInput || !previewList) return;
    
    const files = filesInput.files;
    if (files.length === 0) {
        previewList.innerHTML = '';
        return;
    }
    
    previewList.innerHTML = Array.from(files).map(file => `
        <div class="file-item">
            <div class="file-info">
                <i class="fas fa-file-signature"></i>
                <div>
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${formatFileSize(file.size)}</div>
                </div>
            </div>
        </div>
    `).join('');
}

// 승인 제출
async function submitApproval(approvalId) {
    const filesInput = document.getElementById('signedFiles');
    const feedbackText = document.getElementById('approvalFeedback').value.trim();
    
    if (!confirm('결재를 승인하시겠습니까?')) return;
    
    try {
        // 사인 파일 읽기
        const signedFiles = [];
        if (filesInput && filesInput.files.length > 0) {
            showToast('파일 업로드 중...', 'info');
            for (let i = 0; i < filesInput.files.length; i++) {
                const file = filesInput.files[i];
                const fileData = await readFileAsBase64(file);
                signedFiles.push({
                    fileName: file.name,
                    fileData: fileData
                });
            }
        }
        
        await processApproval(approvalId, 'approved', feedbackText, signedFiles);
        closeApprovalModal();
        
    } catch (error) {
        console.error('❌ 승인 처리 오류:', error);
        showToast('승인 처리 중 오류가 발생했습니다', 'error');
    }
}

// 피드백 모달 표시
function showFeedbackModal(approvalId) {
    const approvalModal = document.getElementById('approvalModal');
    const modalBody = document.getElementById('approvalModalBody');
    
    modalBody.innerHTML = `
        <div class="detail-section">
            <h3><i class="fas fa-comment-dots"></i> 반려 사유 입력</h3>
            <p style="color: var(--text-secondary); margin-bottom: 16px;">
                신청자에게 전달할 반려 사유를 입력해주세요.
            </p>
            <textarea 
                id="feedbackText" 
                rows="6" 
                placeholder="반려 사유를 입력하세요..."
                style="width: 100%; padding: 12px; border: 2px solid var(--border); border-radius: 8px; font-family: 'Noto Sans KR', sans-serif; font-size: 14px;"
            ></textarea>
        </div>
        <div class="modal-actions">
            <button class="btn btn-danger" onclick="submitRejection('${approvalId}')">
                <i class="fas fa-paper-plane"></i> 반려 완료
            </button>
            <button class="btn btn-secondary" onclick="window.viewApprovalDetail('${approvalId}')">
                <i class="fas fa-arrow-left"></i> 돌아가기
            </button>
        </div>
    `;
}

// 반려 제출
async function submitRejection(approvalId) {
    const feedback = document.getElementById('feedbackText').value.trim();
    
    if (!feedback) {
        showToast('반려 사유를 입력해주세요', 'warning');
        return;
    }
    
    if (!confirm('입력한 내용으로 반려하시겠습니까?')) return;
    
    await processApproval(approvalId, 'rejected', feedback);
    closeApprovalModal();
}

// 파일 다운로드
function downloadFile(fileData, fileName) {
    const link = document.createElement('a');
    link.href = fileData;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ===== 결재 처리 =====
async function processApproval(approvalId, status, feedback = '', signedFiles = []) {
    try {
        const updateData = {
            status,
            feedback,
            processedAt: new Date().toISOString(),
            processedBy: currentUser.id
        };
        
        // 사인 파일이 있으면 추가
        if (signedFiles.length > 0) {
            updateData.signedFiles = signedFiles;
        }
        
        await DB.update('approvals', approvalId, updateData);
        
        const statusText = status === 'approved' ? '승인' : '반려';
        showToast(`결재가 ${statusText}되었습니다`, 'success');
        loadPageData(currentPage);
        
    } catch (error) {
        console.error('❌ 결재 처리 오류:', error);
        showToast('결재 처리 중 오류가 발생했습니다', 'error');
    }
}

// ===== 관리자: 직원 계정 생성 =====
async function loadEmployeeRegistration() {
    await loadEmployeeList();
}

async function handleEmployeeRegistration(e) {
    e.preventDefault();
    
    const name = document.getElementById('employeeName').value.trim();
    const email = document.getElementById('employeeEmail').value.trim();
    const password = document.getElementById('employeePassword').value;
    const passwordConfirm = document.getElementById('employeePasswordConfirm').value;
    const role = document.getElementById('employeeRole').value;
    
    // 유효성 검사
    if (!name || !email || !password || !passwordConfirm || !role) {
        showToast('모든 필드를 입력해주세요', 'error');
        return;
    }
    
    if (password !== passwordConfirm) {
        showToast('비밀번호가 일치하지 않습니다', 'error');
        return;
    }
    
    if (password.length < 6) {
        showToast('비밀번호는 최소 6자 이상이어야 합니다', 'error');
        return;
    }
    
    try {
        console.log('👤 직원 계정 생성 시도:', email);
        
        // 중복 확인
        const users = await DB.getAll('users');
        const existingUser = users.find(u => u.email === email);
        
        if (existingUser) {
            showToast('이미 사용 중인 이메일입니다', 'error');
            return;
        }
        
        // 직원 계정 생성 (즉시 승인 상태로)
        const newUser = {
            name,
            email,
            password,
            role,
            status: 'approved',
            createdAt: new Date().toISOString()
        };
        
        await DB.create('users', newUser);
        
        console.log('✅ 직원 계정 생성 완료:', email);
        showToast(`${name}님의 계정이 생성되었습니다!`, 'success');
        
        // 폼 초기화 및 목록 새로고침
        document.getElementById('employeeRegistrationForm').reset();
        await loadEmployeeList();
        
    } catch (error) {
        console.error('❌ 직원 계정 생성 오류:', error);
        showToast('계정 생성 중 오류가 발생했습니다', 'error');
    }
}

async function loadEmployeeList() {
    const listEl = document.getElementById('employeesList');
    if (!listEl) return;
    
    try {
        const users = await DB.getAll('users');
        const employees = users.filter(u => u.role !== 'admin');
        
        if (employees.length === 0) {
            listEl.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">생성된 직원 계정이 없습니다.</p>';
            return;
        }
        
        listEl.innerHTML = employees.map(emp => `
            <div class="user-card">
                <div>
                    <h4>${emp.name}</h4>
                    <p>${emp.email}</p>
                    <span class="badge badge-${emp.role}">${getRoleText(emp.role)}</span>
                </div>
                <div class="user-actions">
                    <button class="btn btn-sm btn-danger" onclick="window.deleteEmployee('${emp.id}', '${emp.name}')">
                        <i class="fas fa-trash"></i> 삭제
                    </button>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('❌ 직원 목록 로드 오류:', error);
        if (listEl) {
            listEl.innerHTML = '<p style="color: var(--danger);">데이터를 불러오는 중 오류가 발생했습니다.</p>';
        }
    }
}

async function deleteEmployee(userId, userName) {
    if (!confirm(`정말 ${userName}님의 계정을 삭제하시겠습니까?`)) return;
    
    try {
        await DB.delete('users', userId);
        showToast('계정이 삭제되었습니다', 'success');
        await loadEmployeeList();
    } catch (error) {
        console.error('❌ 계정 삭제 오류:', error);
        showToast('계정 삭제 중 오류가 발생했습니다', 'error');
    }
}

// ===== 관리자: 가입 승인 =====
async function loadPendingUsers() {
    const listEl = document.getElementById('pendingUsersList');
    if (!listEl) return;
    
    try {
        const pendingUsers = await DB.getAll('pendingUsers');
        
        if (pendingUsers.length === 0) {
            listEl.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">가입 대기 중인 사용자가 없습니다.</p>';
            return;
        }
        
        listEl.innerHTML = pendingUsers.map(user => `
            <div class="user-card">
                <div>
                    <h4>${user.name}</h4>
                    <p>${user.email}</p>
                    <span class="badge badge-${user.role}">${getRoleText(user.role)}</span>
                </div>
                <div class="user-actions">
                    <button class="btn btn-sm btn-success" onclick="window.approveUser('${user.id}', '${user.name}', '${user.email}', '${user.password}', '${user.role}', '${user.createdAt}')">
                        <i class="fas fa-check"></i> 승인
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="window.rejectUser('${user.id}')">
                        <i class="fas fa-times"></i> 반려
                    </button>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('❌ 가입 대기 목록 로드 오류:', error);
        listEl.innerHTML = '<p style="color: var(--danger);">데이터를 불러오는 중 오류가 발생했습니다.</p>';
    }
}

async function approveUser(pendingUserId, name, email, password, role, createdAt) {
    try {
        // users 컬렉션에 추가
        await DB.create('users', {
            name,
            email,
            password,
            role,
            status: 'approved',
            createdAt
        });
        
        // pendingUsers에서 삭제
        await DB.delete('pendingUsers', pendingUserId);
        
        showToast(`${name}님의 가입을 승인했습니다`, 'success');
        await loadPendingUsers();
        
    } catch (error) {
        console.error('❌ 가입 승인 오류:', error);
        showToast('가입 승인 중 오류가 발생했습니다', 'error');
    }
}

async function rejectUser(pendingUserId) {
    if (!confirm('정말 가입을 반려하시겠습니까?')) return;
    
    try {
        await DB.delete('pendingUsers', pendingUserId);
        showToast('가입이 반려되었습니다', 'success');
        await loadPendingUsers();
    } catch (error) {
        console.error('❌ 가입 반려 오류:', error);
        showToast('가입 반려 중 오류가 발생했습니다', 'error');
    }
}

// ===== 관리자: 회원 관리 =====
async function loadUserManagement() {
    const listEl = document.getElementById('userManagementList');
    if (!listEl) return;
    
    try {
        const users = await DB.getAll('users');
        
        listEl.innerHTML = users.map(user => `
            <div class="user-card">
                <div>
                    <h4>${user.name}</h4>
                    <p>${user.email}</p>
                    <span class="badge badge-${user.role}">${getRoleText(user.role)}</span>
                </div>
                <div class="user-actions">
                    ${user.role !== 'admin' ? `
                        <select 
                            class="role-select" 
                            onchange="window.changeUserRole('${user.id}', this.value, '${user.name}')"
                            style="padding: 8px 12px; border: 2px solid var(--border); border-radius: 8px; margin-right: 8px; cursor: pointer; font-family: 'Noto Sans KR', sans-serif;"
                        >
                            <option value="">역할 변경</option>
                            <option value="requester" ${user.role === 'requester' ? 'disabled' : ''}>신청자</option>
                            <option value="approver" ${user.role === 'approver' ? 'disabled' : ''}>결재자</option>
                        </select>
                        <button class="btn btn-sm btn-danger" onclick="window.deleteEmployee('${user.id}', '${user.name}')">
                            <i class="fas fa-trash"></i> 삭제
                        </button>
                    ` : '<span style="color: var(--text-secondary); font-size: 12px;">관리자 계정</span>'}
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('❌ 회원 관리 로드 오류:', error);
        listEl.innerHTML = '<p style="color: var(--danger);">데이터를 불러오는 중 오류가 발생했습니다.</p>';
    }
}

// 사용자 역할 변경
async function changeUserRole(userId, newRole, userName) {
    if (!newRole) return;
    
    const roleText = getRoleText(newRole);
    
    if (!confirm(`${userName}님의 역할을 "${roleText}"(으)로 변경하시겠습니까?`)) {
        // 선택 취소 시 select 초기화
        await loadUserManagement();
        return;
    }
    
    try {
        await DB.update('users', userId, { role: newRole });
        showToast(`${userName}님의 역할이 "${roleText}"(으)로 변경되었습니다`, 'success');
        await loadUserManagement();
    } catch (error) {
        console.error('❌ 역할 변경 오류:', error);
        showToast('역할 변경 중 오류가 발생했습니다', 'error');
    }
}

// ===== 유틸리티 함수 =====
function getRoleText(role) {
    const roles = {
        'admin': '관리자',
        'approver': '결재자',
        'requester': '신청자'
    };
    return roles[role] || role;
}

function getStatusText(status) {
    const statuses = {
        'pending': '대기중',
        'approved': '승인됨',
        'rejected': '반려됨'
    };
    return statuses[status] || status;
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) {
        console.log(`[Toast ${type}]`, message);
        return;
    }
    
    toast.className = `toast show toast-${type}`;
    toast.textContent = message;
    
    setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
}

// ===== 자동 새로고침 =====
function startAutoRefresh() {
    stopAutoRefresh();
    // 5초마다 현재 페이지 데이터 새로고침
    autoRefreshInterval = setInterval(() => {
        if (currentPage) {
            loadPageData(currentPage);
        }
    }, 5000);
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

// ===== 전역 함수 노출 (onclick 이벤트용) =====
window.viewApprovalDetail = viewApprovalDetail;
window.closeApprovalModal = closeApprovalModal;
window.processApprovalFromModal = processApprovalFromModal;
window.showApprovalModal = showApprovalModal;
window.submitApproval = submitApproval;
window.showFeedbackModal = showFeedbackModal;
window.submitRejection = submitRejection;
window.downloadFile = downloadFile;
window.processApproval = processApproval;
window.deleteEmployee = deleteEmployee;
window.changeUserRole = changeUserRole;
window.approveUser = approveUser;
window.rejectUser = rejectUser;

// ===== 이벤트 리스너 등록 =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('📱 DOM 로드 완료');
    
    // 저장된 이메일 복원
    const savedEmail = localStorage.getItem('savedEmail');
    if (savedEmail) {
        const emailInput = document.getElementById('loginEmail');
        const rememberCheckbox = document.getElementById('rememberMe');
        if (emailInput) emailInput.value = savedEmail;
        if (rememberCheckbox) rememberCheckbox.checked = true;
    }
    
    // 로그인/회원가입 폼
    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    
    const signupForm = document.getElementById('signupForm');
    if (signupForm) signupForm.addEventListener('submit', handleSignup);
    
    // 직원 계정 생성 폼
    const employeeForm = document.getElementById('employeeRegistrationForm');
    if (employeeForm) employeeForm.addEventListener('submit', handleEmployeeRegistration);
    
    // 새 결재 요청 폼
    const newRequestForm = document.getElementById('newRequestForm');
    if (newRequestForm) newRequestForm.addEventListener('submit', handleNewRequest);
    
    // 파일 선택 이벤트
    const filesInput = document.getElementById('requestFiles');
    if (filesInput) filesInput.addEventListener('change', updateFilePreview);
    
    // 로그아웃 버튼
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    
    // 페이지 전환 링크
    const showSignupLink = document.getElementById('showSignupLink');
    if (showSignupLink) showSignupLink.addEventListener('click', (e) => {
        e.preventDefault();
        showSignupPage();
    });
    
    const showLoginLink = document.getElementById('showLoginLink');
    if (showLoginLink) showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        showLoginPage();
    });
    
    // 사이드바 메뉴 클릭 이벤트
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', function() {
            const page = this.getAttribute('data-page');
            if (page) {
                navigateToPage(page);
            }
        });
    });
    
    // 앱 초기화
    initializeApp();
});
