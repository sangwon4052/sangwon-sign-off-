// ===================================================================
// 온라인 결재 시스템 - API 버전
// 모든 데이터는 중앙 서버에 저장되어 여러 PC에서 공유됩니다
// ===================================================================

// ===== 전역 상태 =====
let currentUser = null;
let autoRefreshInterval = null;
let currentPage = null;

// ===== RESTful Table API 헬퍼 =====
const API = {
    async get(table, params = {}) {
        try {
            const queryString = new URLSearchParams(params).toString();
            const url = `tables/${table}${queryString ? '?' + queryString : ''}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const result = await response.json();
            return result.data || [];
        } catch (error) {
            console.error(`API GET ${table} 오류:`, error);
            throw error;
        }
    },
    
    async getById(table, id) {
        try {
            const response = await fetch(`tables/${table}/${id}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error(`API GET ${table}/${id} 오류:`, error);
            throw error;
        }
    },
    
    async create(table, data) {
        try {
            const response = await fetch(`tables/${table}`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error(`API CREATE ${table} 오류:`, error);
            throw error;
        }
    },
    
    async update(table, id, data) {
        try {
            const response = await fetch(`tables/${table}/${id}`, {
                method: 'PATCH',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error(`API UPDATE ${table}/${id} 오류:`, error);
            throw error;
        }
    },
    
    async delete(table, id) {
        try {
            const response = await fetch(`tables/${table}/${id}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
        } catch (error) {
            console.error(`API DELETE ${table}/${id} 오류:`, error);
            throw error;
        }
    }
};

// ===== 초기화 =====
async function initializeApp() {
    console.log('앱 초기화 시작...');
    
    try {
        // 기본 관리자 계정 확인 및 생성
        const users = await API.get('users', { limit: 10 });
        console.log('기존 사용자 수:', users.length);
        
        if (users.length === 0) {
            console.log('기본 관리자 계정 생성 중...');
            const adminUser = {
                name: '관리자',
                email: 'admin@company.com',
                password: 'admin123',
                role: 'admin',
                status: 'approved',
                createdAt: new Date().toISOString()
            };
            
            await API.create('users', adminUser);
            console.log('✅ 기본 관리자 계정 생성 완료');
            showToast('기본 관리자 계정이 생성되었습니다', 'success');
        }
        
        // 저장된 세션 확인
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            currentUser = JSON.parse(savedUser);
            console.log('저장된 세션 발견:', currentUser.email);
            showDashboard();
        } else {
            showPage('loginPage');
        }
        
    } catch (error) {
        console.error('초기화 오류:', error);
        showToast('시스템 초기화 중 오류가 발생했습니다', 'error');
        showPage('loginPage');
    }
}

// ===== 페이지 전환 =====
function showPage(pageId) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.style.display = 'none');
    
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.style.display = 'block';
        currentPage = pageId;
    }
}

function showDashboard() {
    // 로그인 페이지 숨기기
    const loginPage = document.getElementById('loginPage');
    const signupPage = document.getElementById('signupPage');
    if (loginPage) loginPage.style.display = 'none';
    if (signupPage) signupPage.style.display = 'none';
    
    // 메인 대시보드 표시
    const mainDashboard = document.getElementById('mainDashboard');
    if (mainDashboard) mainDashboard.style.display = 'block';
    
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
    
    if (!email || !password) {
        showToast('이메일과 비밀번호를 입력해주세요', 'error');
        return;
    }
    
    try {
        console.log('로그인 시도:', email);
        
        // API에서 모든 사용자 조회
        const users = await API.get('users', { limit: 1000 });
        console.log('조회된 사용자 수:', users.length);
        
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
        
        // 로그인 성공
        currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        console.log('✅ 로그인 성공:', user.email);
        showToast('로그인 되었습니다', 'success');
        showDashboard();
        
    } catch (error) {
        console.error('로그인 오류:', error);
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
        console.log('회원가입 시도:', email);
        
        // 중복 확인
        const [users, pendingUsers] = await Promise.all([
            API.get('users', { limit: 1000 }),
            API.get('pendingUsers', { limit: 1000 })
        ]);
        
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
        
        await API.create('pendingUsers', newPendingUser);
        
        console.log('✅ 회원가입 신청 완료:', email);
        showToast('회원가입 신청이 완료되었습니다. 관리자 승인을 기다려주세요.', 'success');
        
        // 폼 초기화 및 로그인 페이지로 이동
        document.getElementById('signupForm').reset();
        setTimeout(() => {
            document.getElementById('signupPage').style.display = 'none';
            document.getElementById('loginPage').style.display = 'block';
        }, 2000);
        
    } catch (error) {
        console.error('회원가입 오류:', error);
        showToast('회원가입 처리 중 오류가 발생했습니다', 'error');
    }
}

// ===== 로그아웃 =====
function handleLogout() {
    stopAutoRefresh();
    currentUser = null;
    localStorage.removeItem('currentUser');
    
    // 메인 대시보드 숨기기
    const mainDashboard = document.getElementById('mainDashboard');
    if (mainDashboard) mainDashboard.style.display = 'none';
    
    // 로그인 페이지 표시
    const loginPage = document.getElementById('loginPage');
    if (loginPage) loginPage.style.display = 'block';
    
    showToast('로그아웃 되었습니다', 'success');
}

// ===== 관리자: 직원 계정 생성 =====
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
        console.log('직원 계정 생성 시도:', email);
        
        // 중복 확인
        const users = await API.get('users', { limit: 1000 });
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
        
        await API.create('users', newUser);
        
        console.log('✅ 직원 계정 생성 완료:', email);
        showToast(`${name}님의 계정이 생성되었습니다`, 'success');
        
        // 폼 초기화 및 목록 새로고침
        document.getElementById('employeeRegistrationForm').reset();
        loadEmployeeList();
        
    } catch (error) {
        console.error('직원 계정 생성 오류:', error);
        showToast('계정 생성 중 오류가 발생했습니다', 'error');
    }
}

// ===== 관리자: 생성된 직원 목록 =====
async function loadEmployeeList() {
    try {
        const users = await API.get('users', { limit: 1000 });
        const employees = users.filter(u => u.role !== 'admin');
        
        const listHtml = employees.map(emp => `
            <div class="user-card">
                <div class="user-info">
                    <h4>${emp.name}</h4>
                    <p>${emp.email}</p>
                    <span class="badge badge-${emp.role}">${getRoleText(emp.role)}</span>
                </div>
                <div class="user-actions">
                    <button class="btn btn-sm btn-danger" onclick="deleteEmployee('${emp.id}')">
                        <i class="fas fa-trash"></i> 삭제
                    </button>
                </div>
            </div>
        `).join('');
        
        const employeeListEl = document.getElementById('employeesList');
        if (employeeListEl) {
            employeeListEl.innerHTML = listHtml || '<p>생성된 직원 계정이 없습니다.</p>';
        }
        
    } catch (error) {
        console.error('직원 목록 로드 오류:', error);
    }
}

// ===== 관리자: 직원 계정 삭제 =====
async function deleteEmployee(userId) {
    if (!confirm('정말 이 계정을 삭제하시겠습니까?')) return;
    
    try {
        await API.delete('users', userId);
        showToast('계정이 삭제되었습니다', 'success');
        loadEmployeeList();
    } catch (error) {
        console.error('계정 삭제 오류:', error);
        showToast('계정 삭제 중 오류가 발생했습니다', 'error');
    }
}

// ===== 페이지 네비게이션 =====
function navigateToPage(page) {
    const pages = ['dashboard', 'myRequests', 'newRequest', 'pendingApprovals', 
                   'approvalHistory', 'adminDashboard', 'pendingUsers', 
                   'userManagement', 'allApprovals', 'employeeRegistration'];
    
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
    document.querySelectorAll('.sidebar a').forEach(link => {
        link.classList.remove('active');
    });
    const activeLink = document.querySelector(`.sidebar a[onclick*="${page}"]`);
    if (activeLink) activeLink.classList.add('active');
    
    // 페이지별 데이터 로드
    loadPageData(page);
}

async function loadPageData(page) {
    try {
        switch(page) {
            case 'dashboard':
                await loadDashboard();
                break;
            case 'employeeRegistration':
                await loadEmployeeList();
                break;
            // 다른 페이지들은 2단계에서 구현
        }
    } catch (error) {
        console.error('페이지 데이터 로드 오류:', error);
    }
}

// ===== 대시보드 =====
async function loadDashboard() {
    const dashboardContent = document.getElementById('dashboardPage');
    if (!dashboardContent) return;
    
    dashboardContent.innerHTML = `
        <h2>대시보드</h2>
        <div class="stats-grid">
            <div class="stat-card">
                <i class="fas fa-user"></i>
                <h3>환영합니다!</h3>
                <p>${currentUser.name}님</p>
            </div>
            <div class="stat-card">
                <i class="fas fa-envelope"></i>
                <h3>역할</h3>
                <p>${getRoleText(currentUser.role)}</p>
            </div>
        </div>
        <p style="margin-top: 20px; color: #64748b;">
            좌측 메뉴에서 원하는 기능을 선택하세요.
        </p>
    `;
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

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) {
        console.log('Toast:', message);
        return;
    }
    
    toast.className = 'toast show toast-' + type;
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

// ===== 이벤트 리스너 등록 =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM 로드 완료');
    
    // 로그인/회원가입 폼
    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    
    const signupForm = document.getElementById('signupForm');
    if (signupForm) signupForm.addEventListener('submit', handleSignup);
    
    // 직원 계정 생성 폼
    const employeeForm = document.getElementById('employeeRegistrationForm');
    if (employeeForm) employeeForm.addEventListener('submit', handleEmployeeRegistration);
    
    // 로그아웃 버튼
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    
    // 페이지 전환 버튼
    const showSignupLink = document.getElementById('showSignupLink');
    if (showSignupLink) showSignupLink.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('signupPage').style.display = 'block';
    });
    
    const showLoginLink = document.getElementById('showLoginLink');
    if (showLoginLink) showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('signupPage').style.display = 'none';
        document.getElementById('loginPage').style.display = 'block';
    });
    
    // 사이드바 메뉴 클릭 이벤트
    document.querySelectorAll('.sidebar .menu-item').forEach(item => {
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
