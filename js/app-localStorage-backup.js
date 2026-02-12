// ===== 전역 상태 관리 =====
let currentUser = null;
let autoRefreshInterval = null;
let currentPage = null;

// ===== 데이터 캐시 =====
let dataCache = {
    users: [],
    pendingUsers: [],
    approvals: [],
    notifications: [],
    lastUpdate: null
};

// ===== API 헬퍼 함수 =====
async function apiGet(table, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = `tables/${table}${queryString ? '?' + queryString : ''}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    return await response.json();
}

async function apiCreate(table, data) {
    const response = await fetch(`tables/${table}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    return await response.json();
}

async function apiUpdate(table, id, data) {
    const response = await fetch(`tables/${table}/${id}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    return await response.json();
}

async function apiDelete(table, id) {
    const response = await fetch(`tables/${table}/${id}`, {
        method: 'DELETE'
    });
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
}

// ===== 데이터 로드 함수 (캐시 사용) =====
async function loadAllData() {
    try {
        const [usersRes, pendingRes, approvalsRes, notificationsRes] = await Promise.all([
            apiGet('users', { limit: 1000 }),
            apiGet('pendingUsers', { limit: 1000 }),
            apiGet('approvals', { limit: 1000 }),
            apiGet('notifications', { limit: 1000 })
        ]);
        
        dataCache.users = usersRes.data;
        dataCache.pendingUsers = pendingRes.data;
        dataCache.approvals = approvalsRes.data;
        dataCache.notifications = notificationsRes.data;
        dataCache.lastUpdate = Date.now();
        
        return true;
    } catch (error) {
        console.error('데이터 로드 오류:', error);
        return false;
    }
}

// ===== LocalStorage 호환 함수 (API 사용) =====
function getUsers() {
    return dataCache.users;
}

function getPendingUsers() {
    return dataCache.pendingUsers;
}

function getApprovals() {
    return dataCache.approvals;
}

function getNotifications() {
    return dataCache.notifications;
}

async function saveUser(user) {
    try {
        const newUser = await apiCreate('users', user);
        dataCache.users.push(newUser);
        return newUser;
    } catch (error) {
        console.error('사용자 저장 오류:', error);
        throw error;
    }
}

async function savePendingUser(user) {
    try {
        const newUser = await apiCreate('pendingUsers', user);
        dataCache.pendingUsers.push(newUser);
        return newUser;
    } catch (error) {
        console.error('가입 신청 저장 오류:', error);
        throw error;
    }
}

async function saveApproval(approval) {
    try {
        const newApproval = await apiCreate('approvals', approval);
        dataCache.approvals.push(newApproval);
        return newApproval;
    } catch (error) {
        console.error('결재 저장 오류:', error);
        throw error;
    }
}

async function updateApproval(id, data) {
    try {
        const updated = await apiUpdate('approvals', id, data);
        const index = dataCache.approvals.findIndex(a => a.id === id);
        if (index !== -1) {
            dataCache.approvals[index] = updated;
        }
        return updated;
    } catch (error) {
        console.error('결재 업데이트 오류:', error);
        throw error;
    }
}

async function saveNotification(notification) {
    try {
        const newNotification = await apiCreate('notifications', notification);
        dataCache.notifications.push(newNotification);
        return newNotification;
    } catch (error) {
        console.error('알림 저장 오류:', error);
        throw error;
    }
}

async function updateNotification(id, data) {
    try {
        const updated = await apiUpdate('notifications', id, data);
        const index = dataCache.notifications.findIndex(n => n.id === id);
        if (index !== -1) {
            dataCache.notifications[index] = updated;
        }
        return updated;
    } catch (error) {
        console.error('알림 업데이트 오류:', error);
        throw error;
    }
}

async function deleteUserById(id) {
    try {
        await apiDelete('users', id);
        dataCache.users = dataCache.users.filter(u => u.id !== id);
        return true;
    } catch (error) {
        console.error('사용자 삭제 오류:', error);
        throw error;
    }
}

async function deletePendingUserById(id) {
    try {
        await apiDelete('pendingUsers', id);
        dataCache.pendingUsers = dataCache.pendingUsers.filter(u => u.id !== id);
        return true;
    } catch (error) {
        console.error('가입 신청 삭제 오류:', error);
        throw error;
    }
}

async function deleteNotificationById(id) {
    try {
        await apiDelete('notifications', id);
        dataCache.notifications = dataCache.notifications.filter(n => n.id !== id);
        return true;
    } catch (error) {
        console.error('알림 삭제 오류:', error);
        throw error;
    }
}

async function approvePendingUser(userId) {
    try {
        const user = dataCache.pendingUsers.find(u => u.id === userId);
        if (!user) return false;
        
        // pendingUsers에서 users로 이동
        const approvedUser = {
            ...user,
            status: 'approved'
        };
        
        await saveUser(approvedUser);
        await deletePendingUserById(userId);
        
        return true;
    } catch (error) {
        console.error('사용자 승인 오류:', error);
        throw error;
    }
}

// ===== API 헬퍼 함수 =====
async function apiGet(table, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = `tables/${table}${queryString ? '?' + queryString : ''}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    return await response.json();
}

async function apiGetById(table, id) {
    const response = await fetch(`tables/${table}/${id}`);
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    return await response.json();
}

async function apiCreate(table, data) {
    const response = await fetch(`tables/${table}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    return await response.json();
}

async function apiUpdate(table, id, data) {
    const response = await fetch(`tables/${table}/${id}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    return await response.json();
}

async function apiDelete(table, id) {
    const response = await fetch(`tables/${table}/${id}`, {
        method: 'DELETE'
    });
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
}

// ===== 초기화 =====
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
});

async function initializeApp() {
    // 데이터 로드
    const loaded = await loadAllData();
    if (!loaded) {
        showToast('데이터 로드 중 오류가 발생했습니다.', 'error');
    }
    
    // 로그인 상태 확인
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showDashboard();
    } else {
        showPage('loginPage');
    }
}

// ===== 이벤트 리스너 설정 =====
function setupEventListeners() {
    // 로그인/회원가입 전환
    document.getElementById('showSignupLink').addEventListener('click', function(e) {
        e.preventDefault();
        showPage('signupPage');
    });

    document.getElementById('showLoginLink').addEventListener('click', function(e) {
        e.preventDefault();
        showPage('loginPage');
    });

    // 로그인
    document.getElementById('loginForm').addEventListener('submit', handleLogin);

    // 회원가입
    document.getElementById('signupForm').addEventListener('submit', handleSignup);

    // 로그아웃
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // 사이드바 메뉴
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', function() {
            const page = this.getAttribute('data-page');
            navigateToPage(page);
        });
    });

    // 새 결재 요청
    document.getElementById('newRequestForm').addEventListener('submit', handleNewRequest);

    // 파일 선택 시 미리보기
    document.getElementById('requestFile').addEventListener('change', updateFileList);

    // 관리자 등록
    document.getElementById('adminRegistrationForm').addEventListener('submit', handleAdminRegistration);

    // 필터
    document.getElementById('myRequestsFilter')?.addEventListener('change', loadMyRequests);
    document.getElementById('historyFilter')?.addEventListener('change', loadApprovalHistory);
    document.getElementById('allApprovalsFilter')?.addEventListener('change', loadAllApprovals);
    document.getElementById('userRoleFilter')?.addEventListener('change', loadUserManagement);

    // 모달 닫기
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });

    // 모달 외부 클릭시 닫기
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });

    // 알림 아이콘 클릭
    document.getElementById('notificationIcon').addEventListener('click', toggleNotificationPanel);

    // 알림 패널 닫기
    document.getElementById('closeNotificationBtn').addEventListener('click', function() {
        document.getElementById('notificationPanel').style.display = 'none';
    });

    // 모두 읽음 처리
    document.getElementById('markAllReadBtn').addEventListener('click', markAllNotificationsRead);

    // 모두 삭제
    document.getElementById('clearAllNotificationsBtn').addEventListener('click', clearAllNotifications);
}

// ===== 페이지 표시 =====
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.style.display = 'none';
    });
    document.getElementById(pageId).style.display = 'block';
}

function navigateToPage(pageName) {
    // 현재 페이지 저장
    currentPage = pageName;
    
    // 사이드바 메뉴 활성화
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-page="${pageName}"]`).classList.add('active');

    // 컨텐츠 페이지 표시
    document.querySelectorAll('.content-page').forEach(page => {
        page.style.display = 'none';
    });

    // 페이지별 로드 함수 실행
    switch(pageName) {
        case 'dashboard':
            document.getElementById('dashboardPage').style.display = 'block';
            loadDashboard();
            break;
        case 'myRequests':
            document.getElementById('myRequestsPage').style.display = 'block';
            loadMyRequests();
            break;
        case 'newRequest':
            document.getElementById('newRequestPage').style.display = 'block';
            loadNewRequestPage();
            break;
        case 'pendingApprovals':
            document.getElementById('pendingApprovalsPage').style.display = 'block';
            loadPendingApprovals();
            break;
        case 'approvalHistory':
            document.getElementById('approvalHistoryPage').style.display = 'block';
            loadApprovalHistory();
            break;
        case 'adminDashboard':
            document.getElementById('adminDashboardPage').style.display = 'block';
            loadAdminDashboard();
            break;
        case 'pendingUsers':
            document.getElementById('pendingUsersPage').style.display = 'block';
            loadPendingUsers();
            break;
        case 'userManagement':
            document.getElementById('userManagementPage').style.display = 'block';
            loadUserManagement();
            break;
        case 'allApprovals':
            document.getElementById('allApprovalsPage').style.display = 'block';
            loadAllApprovals();
            break;
        case 'adminRegistration':
            document.getElementById('adminRegistrationPage').style.display = 'block';
            loadAdminRegistration();
            break;
    }
}

// ===== 로그인 =====
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    await loadAllData(); // 최신 데이터 로드
    const users = getUsers();
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        if (user.status !== 'approved') {
            showToast('가입 승인 대기 중입니다.', 'warning');
            return;
        }

        currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        showDashboard();
        showToast('로그인 되었습니다.', 'success');
    } else {
        showToast('이메일 또는 비밀번호가 올바르지 않습니다.', 'error');
    }
}

// ===== 회원가입 =====
async function handleSignup(e) {
    e.preventDefault();

    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const role = document.getElementById('signupRole').value;

    await loadAllData(); // 최신 데이터 로드
    const users = getUsers();
    const pendingUsers = getPendingUsers();

    // 이메일 중복 체크
    if (users.some(u => u.email === email) || pendingUsers.some(u => u.email === email)) {
        showToast('이미 등록된 이메일입니다.', 'error');
        return;
    }

    const newUser = {
        id: generateId(),
        name: name,
        email: email,
        password: password,
        role: role,
        createdAt: new Date().toISOString()
    };

    try {
        await savePendingUser(newUser);
        showToast('가입 신청이 완료되었습니다. 관리자 승인을 기다려주세요.', 'success');
        
        document.getElementById('signupForm').reset();
        
        setTimeout(() => {
            showPage('loginPage');
        }, 2000);
    } catch (error) {
        showToast('회원가입 중 오류가 발생했습니다.', 'error');
    }
}

// ===== 로그아웃 =====
function handleLogout() {
    // 자동 새로고침 중지
    stopAutoRefresh();
    
    currentUser = null;
    localStorage.removeItem('currentUser');
    showPage('loginPage');
    showToast('로그아웃 되었습니다.', 'success');
}

// ===== 대시보드 표시 =====
function showDashboard() {
    showPage('mainDashboard');

    // 사용자 정보 표시
    document.getElementById('navbarUserName').textContent = currentUser.name;
    const roleElement = document.getElementById('navbarUserRole');
    roleElement.textContent = getRoleText(currentUser.role);
    roleElement.className = `user-role ${currentUser.role}`;

    // 역할별 메뉴 표시
    document.querySelectorAll('.requester-menu').forEach(el => {
        el.style.display = (currentUser.role === 'requester' || currentUser.role === 'admin') ? 'flex' : 'none';
    });

    document.querySelectorAll('.approver-menu').forEach(el => {
        el.style.display = (currentUser.role === 'approver' || currentUser.role === 'admin') ? 'flex' : 'none';
    });

    document.querySelectorAll('.admin-menu').forEach(el => {
        el.style.display = currentUser.role === 'admin' ? 'flex' : 'none';
    });

    // 대시보드 로드
    navigateToPage('dashboard');
    updateBadges();
    updateNotificationBadge();
    
    // 자동 새로고침 시작
    startAutoRefresh();
}

// ===== 대시보드 로드 =====
async function loadDashboard() {
    await loadAllData(); // 최신 데이터 로드
    const approvals = getApprovals();
    const statsContainer = document.getElementById('statsContainer');
    const recentActivity = document.getElementById('recentActivity');

    // 역할별 통계
    let stats = [];

    if (currentUser.role === 'requester') {
        const myApprovals = approvals.filter(a => a.requesterId === currentUser.id);
        stats = [
            { icon: 'fa-file-alt', label: '전체 신청', value: myApprovals.length, color: '' },
            { icon: 'fa-clock', label: '대기중', value: myApprovals.filter(a => a.status === 'pending').length, color: 'pending' },
            { icon: 'fa-check-circle', label: '승인됨', value: myApprovals.filter(a => a.status === 'approved').length, color: 'approved' },
            { icon: 'fa-times-circle', label: '반려됨', value: myApprovals.filter(a => a.status === 'rejected').length, color: 'rejected' }
        ];
    } else if (currentUser.role === 'approver') {
        const myPending = approvals.filter(a => a.status === 'pending' && a.assignedApproverId === currentUser.id);
        stats = [
            { icon: 'fa-clipboard-check', label: '처리할 결재', value: myPending.length, color: 'pending' },
            { icon: 'fa-check-circle', label: '승인함', value: approvals.filter(a => a.status === 'approved' && a.processedBy === currentUser.id).length, color: 'approved' },
            { icon: 'fa-times-circle', label: '반려함', value: approvals.filter(a => a.status === 'rejected' && a.processedBy === currentUser.id).length, color: 'rejected' }
        ];
    } else if (currentUser.role === 'admin') {
        const pendingUsers = getPendingUsers();
        stats = [
            { icon: 'fa-file-alt', label: '전체 결재', value: approvals.length, color: '' },
            { icon: 'fa-clock', label: '대기중', value: approvals.filter(a => a.status === 'pending').length, color: 'pending' },
            { icon: 'fa-user-clock', label: '가입 대기', value: pendingUsers.length, color: 'pending' }
        ];
    }

    statsContainer.innerHTML = stats.map(stat => `
        <div class="stat-card ${stat.color}">
            <i class="fas ${stat.icon}"></i>
            <div class="stat-info">
                <h3>${stat.value}</h3>
                <p>${stat.label}</p>
            </div>
        </div>
    `).join('');

    // 최근 활동
    let recentApprovals = [];
    if (currentUser.role === 'requester') {
        recentApprovals = approvals.filter(a => a.requesterId === currentUser.id).slice(-5).reverse();
    } else if (currentUser.role === 'approver') {
        recentApprovals = approvals.filter(a => a.status === 'pending' || a.processedBy === currentUser.id).slice(-5).reverse();
    } else {
        recentApprovals = approvals.slice(-5).reverse();
    }

    if (recentApprovals.length === 0) {
        recentActivity.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>최근 활동이 없습니다.</p></div>';
    } else {
        recentActivity.innerHTML = recentApprovals.map(approval => {
            const requester = getUser(approval.requesterId);
            return `
                <div class="activity-item ${approval.status}">
                    <h4>${approval.title}</h4>
                    <p>신청자: ${requester?.name || '알 수 없음'}</p>
                    <p>상태: ${getStatusText(approval.status)}</p>
                    <span class="activity-time">${formatDate(approval.createdAt)}</span>
                </div>
            `;
        }).join('');
    }
}

// ===== 내 결재 신청 로드 =====
async function loadMyRequests() {
    await loadAllData();
    const approvals = getApprovals();
    const filter = document.getElementById('myRequestsFilter').value;
    const list = document.getElementById('myRequestsList');

    let filtered = approvals.filter(a => a.requesterId === currentUser.id);
    
    if (filter !== 'all') {
        filtered = filtered.filter(a => a.status === filter);
    }

    if (filtered.length === 0) {
        list.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>결재 내역이 없습니다.</p></div>';
        return;
    }

    list.innerHTML = filtered.reverse().map(approval => {
        const processor = approval.processedBy ? getUser(approval.processedBy) : null;
        const assignedApprover = approval.assignedApproverId ? getUser(approval.assignedApproverId) : null;
        
        const files = approval.files || [];
        const signedFiles = approval.signedFiles || [];
        
        return `
            <div class="approval-card ${approval.status}">
                <div class="approval-header">
                    <div>
                        <div class="approval-title">${approval.title}</div>
                        <div class="approval-meta">
                            <span><i class="fas fa-calendar"></i> ${formatDate(approval.createdAt)}</span>
                            ${assignedApprover ? `<span><i class="fas fa-user-tag"></i> 담당자: ${assignedApprover.name}</span>` : ''}
                            ${processor ? `<span><i class="fas fa-user-check"></i> 처리자: ${processor.name}</span>` : ''}
                        </div>
                    </div>
                    <span class="approval-status ${approval.status}">${getStatusText(approval.status)}</span>
                </div>
                <div class="approval-description">${approval.description}</div>
                ${approval.feedback ? `
                    <div class="approval-feedback">
                        <strong>피드백:</strong>
                        <p>${approval.feedback}</p>
                    </div>
                ` : ''}
                ${signedFiles.length > 0 ? `
                    <div class="signed-file-notice">
                        <i class="fas fa-file-signature"></i>
                        <strong>사인된 파일이 업로드되었습니다!</strong>
                        <p>${signedFiles.length}개의 파일</p>
                    </div>
                ` : ''}
                <div class="approval-actions">
                    <button class="btn btn-sm btn-primary" onclick="viewApprovalDetail('${approval.id}')">
                        <i class="fas fa-eye"></i> 상세보기
                    </button>
                    ${files.map((file, idx) => `
                        <button class="btn btn-sm btn-secondary" onclick="downloadFile('${file.data}', '${file.name}')">
                            <i class="fas fa-download"></i> ${files.length > 1 ? `파일 ${idx + 1}` : '원본 파일'}
                        </button>
                    `).join('')}
                    ${signedFiles.map((file, idx) => `
                        <button class="btn btn-sm btn-success" onclick="downloadFile('${file.data}', '${file.name}')">
                            <i class="fas fa-file-signature"></i> ${signedFiles.length > 1 ? `사인 ${idx + 1}` : '사인된 파일'}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
}

// ===== 새 결재 요청 페이지 로드 =====
async function loadNewRequestPage() {
    await loadAllData();
    const users = getUsers();
    const approvers = users.filter(u => (u.role === 'approver' || u.role === 'admin') && u.status === 'approved');
    
    const approverSelect = document.getElementById('requestApprover');
    approverSelect.innerHTML = '<option value="">결재자를 선택하세요</option>';
    
    approvers.forEach(approver => {
        const option = document.createElement('option');
        option.value = approver.id;
        option.textContent = `${approver.name} (${approver.email})`;
        approverSelect.appendChild(option);
    });
    
    if (approvers.length === 0) {
        approverSelect.innerHTML = '<option value="">등록된 결재자가 없습니다</option>';
        approverSelect.disabled = true;
    } else {
        approverSelect.disabled = false;
    }
    
    document.getElementById('fileList').innerHTML = '';
}

// ===== 파일 목록 미리보기 =====
function updateFileList() {
    const fileInput = document.getElementById('requestFile');
    const fileList = document.getElementById('fileList');
    const files = Array.from(fileInput.files);
    
    if (files.length === 0) {
        fileList.innerHTML = '';
        return;
    }
    
    fileList.innerHTML = `
        <div style="margin-top: 10px; padding: 10px; background: var(--bg-color); border-radius: 8px;">
            <strong>선택된 파일 (${files.length}개):</strong>
            <ul style="margin: 5px 0 0 20px; padding: 0;">
                ${files.map(file => `<li>${file.name} (${formatFileSize(file.size)})</li>`).join('')}
            </ul>
        </div>
    `;
}

// ===== 파일 크기 포맷 =====
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// ===== 새 결재 요청 =====
function handleNewRequest(e) {
    e.preventDefault();

    const title = document.getElementById('requestTitle').value;
    const description = document.getElementById('requestDescription').value;
    const assignedApproverId = document.getElementById('requestApprover').value;
    const fileInput = document.getElementById('requestFile');
    const files = Array.from(fileInput.files);

    if (!assignedApproverId) {
        showToast('담당 결재자를 선택해주세요.', 'error');
        return;
    }

    if (files.length === 0) {
        showToast('파일을 첨부해주세요.', 'error');
        return;
    }

    // 다중 파일 읽기
    const filePromises = files.map(file => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                resolve({
                    name: file.name,
                    data: e.target.result
                });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    });

    Promise.all(filePromises).then(fileResults => {
        const approval = {
            id: generateId(),
            title: title,
            description: description,
            files: fileResults, // 여러 파일을 배열로 저장
            requesterId: currentUser.id,
            assignedApproverId: assignedApproverId,
            status: 'pending',
            createdAt: new Date().toISOString(),
            processedBy: null,
            processedAt: null,
            feedback: null,
            signedFiles: [] // 결재자가 업로드하는 파일들
        };

        const approvals = JSON.parse(localStorage.getItem('approvals') || '[]');
        approvals.push(approval);
        localStorage.setItem('approvals', JSON.stringify(approvals));

        showToast('결재 요청이 완료되었습니다.', 'success');
        document.getElementById('newRequestForm').reset();
        document.getElementById('fileList').innerHTML = '';
        
        updateBadges();
        navigateToPage('myRequests');
    }).catch(error => {
        console.error('파일 업로드 오류:', error);
        showToast('파일 업로드 중 오류가 발생했습니다.', 'error');
    });
}

// ===== 처리할 결재 로드 =====
function loadPendingApprovals() {
    const approvals = JSON.parse(localStorage.getItem('approvals') || '[]');
    const list = document.getElementById('pendingApprovalsList');

    // 현재 사용자에게 할당된 대기중인 결재만 필터링
    let pending = approvals.filter(a => a.status === 'pending');
    
    // 관리자가 아닌 경우, 자신에게 할당된 결재만 표시
    if (currentUser.role !== 'admin') {
        pending = pending.filter(a => a.assignedApproverId === currentUser.id);
    }

    if (pending.length === 0) {
        list.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>처리할 결재가 없습니다.</p></div>';
        return;
    }

    list.innerHTML = pending.reverse().map(approval => {
        const requester = getUser(approval.requesterId);
        const isAssignedToMe = approval.assignedApproverId === currentUser.id;
        const assignedApprover = approval.assignedApproverId ? getUser(approval.assignedApproverId) : null;
        
        // 이전 버전 호환성 (단일 파일)
        const files = approval.files || (approval.fileName ? [{name: approval.fileName, data: approval.fileData}] : []);
        
        return `
            <div class="approval-card ${approval.status}">
                <div class="approval-header">
                    <div>
                        <div class="approval-title">${approval.title}</div>
                        <div class="approval-meta">
                            <span><i class="fas fa-user"></i> 신청자: ${requester?.name || '알 수 없음'}</span>
                            ${assignedApprover ? `<span><i class="fas fa-user-tag"></i> 담당자: ${assignedApprover.name}</span>` : ''}
                            <span><i class="fas fa-calendar"></i> ${formatDate(approval.createdAt)}</span>
                        </div>
                    </div>
                    <span class="approval-status ${approval.status}">${getStatusText(approval.status)}</span>
                </div>
                <div class="approval-description">${approval.description}</div>
                <div class="approval-actions">
                    <button class="btn btn-sm btn-primary" onclick="viewApprovalDetail('${approval.id}')">
                        <i class="fas fa-eye"></i> 상세보기
                    </button>
                    ${files.map((file, idx) => `
                        <button class="btn btn-sm btn-secondary" onclick="downloadFile('${file.data}', '${file.name}')">
                            <i class="fas fa-download"></i> ${files.length > 1 ? `파일 ${idx + 1}` : '파일 다운로드'}
                        </button>
                    `).join('')}
                    ${(isAssignedToMe || currentUser.role === 'admin') ? `
                        <button class="btn btn-sm btn-success" onclick="showProcessModal('${approval.id}', 'approved')">
                            <i class="fas fa-check"></i> 승인
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="showProcessModal('${approval.id}', 'rejected')">
                            <i class="fas fa-times"></i> 반려
                        </button>
                    ` : '<span style="color: var(--text-secondary); font-size: 12px;">다른 담당자의 결재입니다</span>'}
                </div>
            </div>
        `;
    }).join('');
}

// ===== 처리 완료 로드 =====
function loadApprovalHistory() {
    const approvals = JSON.parse(localStorage.getItem('approvals') || '[]');
    const filter = document.getElementById('historyFilter').value;
    const list = document.getElementById('approvalHistoryList');

    let filtered = approvals.filter(a => a.processedBy === currentUser.id);
    
    if (filter !== 'all') {
        filtered = filtered.filter(a => a.status === filter);
    }

    if (filtered.length === 0) {
        list.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>처리 내역이 없습니다.</p></div>';
        return;
    }

    list.innerHTML = filtered.reverse().map(approval => {
        const requester = getUser(approval.requesterId);
        const assignedApprover = approval.assignedApproverId ? getUser(approval.assignedApproverId) : null;
        
        // 이전 버전 호환성 (단일 파일)
        const files = approval.files || (approval.fileName ? [{name: approval.fileName, data: approval.fileData}] : []);
        const signedFiles = approval.signedFiles || (approval.signedFileName ? [{name: approval.signedFileName, data: approval.signedFileData}] : []);
        
        return `
            <div class="approval-card ${approval.status}">
                <div class="approval-header">
                    <div>
                        <div class="approval-title">${approval.title}</div>
                        <div class="approval-meta">
                            <span><i class="fas fa-user"></i> 신청자: ${requester?.name || '알 수 없음'}</span>
                            ${assignedApprover ? `<span><i class="fas fa-user-tag"></i> 담당자: ${assignedApprover.name}</span>` : ''}
                            <span><i class="fas fa-calendar"></i> 처리일: ${formatDate(approval.processedAt)}</span>
                        </div>
                    </div>
                    <span class="approval-status ${approval.status}">${getStatusText(approval.status)}</span>
                </div>
                <div class="approval-description">${approval.description}</div>
                ${approval.feedback ? `
                    <div class="approval-feedback">
                        <strong>피드백:</strong>
                        <p>${approval.feedback}</p>
                    </div>
                ` : ''}
                <div class="approval-actions">
                    <button class="btn btn-sm btn-primary" onclick="viewApprovalDetail('${approval.id}')">
                        <i class="fas fa-eye"></i> 상세보기
                    </button>
                    ${files.map((file, idx) => `
                        <button class="btn btn-sm btn-secondary" onclick="downloadFile('${file.data}', '${file.name}')">
                            <i class="fas fa-download"></i> ${files.length > 1 ? `파일 ${idx + 1}` : '파일'}
                        </button>
                    `).join('')}
                    ${signedFiles.map((file, idx) => `
                        <button class="btn btn-sm btn-success" onclick="downloadFile('${file.data}', '${file.name}')">
                            <i class="fas fa-file-signature"></i> ${signedFiles.length > 1 ? `사인 ${idx + 1}` : '사인'}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
}

// ===== 관리자 대시보드 로드 =====
function loadAdminDashboard() {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const pendingUsers = JSON.parse(localStorage.getItem('pendingUsers') || '[]');
    const approvals = JSON.parse(localStorage.getItem('approvals') || '[]');

    document.getElementById('totalUsersCount').textContent = users.length;
    document.getElementById('pendingUsersCountAdmin').textContent = pendingUsers.length;
    document.getElementById('totalApprovalsCount').textContent = approvals.length;
    document.getElementById('pendingApprovalsCount').textContent = approvals.filter(a => a.status === 'pending').length;
}

// ===== 가입 승인 대기 로드 =====
function loadPendingUsers() {
    const pendingUsers = JSON.parse(localStorage.getItem('pendingUsers') || '[]');
    const list = document.getElementById('pendingUsersList');

    if (pendingUsers.length === 0) {
        list.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>가입 대기 중인 사용자가 없습니다.</p></div>';
        return;
    }

    list.innerHTML = pendingUsers.map(user => `
        <div class="user-card">
            <div class="user-info">
                <h4>${user.name}</h4>
                <p>${user.email}</p>
                <p>신청 역할: ${getRoleText(user.role)}</p>
                <p>신청일: ${formatDate(user.createdAt)}</p>
            </div>
            <div class="user-actions">
                <button class="btn btn-sm btn-success" onclick="approveUser('${user.id}')">
                    <i class="fas fa-check"></i> 승인
                </button>
                <button class="btn btn-sm btn-danger" onclick="rejectUser('${user.id}')">
                    <i class="fas fa-times"></i> 반려
                </button>
            </div>
        </div>
    `).join('');
}

// ===== 회원 관리 로드 =====
function loadUserManagement() {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const filter = document.getElementById('userRoleFilter').value;
    const tbody = document.getElementById('usersTableBody');

    let filtered = users;
    if (filter !== 'all') {
        filtered = users.filter(u => u.role === filter);
    }

    tbody.innerHTML = filtered.map(user => `
        <tr>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${getRoleText(user.role)}</td>
            <td>${formatDate(user.createdAt)}</td>
            <td>
                ${user.role !== 'admin' ? `
                    <select onchange="changeUserRole('${user.id}', this.value)" class="form-control">
                        <option value="">역할 변경</option>
                        <option value="requester" ${user.role === 'requester' ? 'selected' : ''}>신청자</option>
                        <option value="approver" ${user.role === 'approver' ? 'selected' : ''}>결재자</option>
                        <option value="admin">관리자</option>
                    </select>
                    <button class="btn btn-sm btn-danger" onclick="deleteUser('${user.id}')" style="margin-top: 5px;">
                        <i class="fas fa-trash"></i> 삭제
                    </button>
                ` : '<span style="color: var(--admin-color);">관리자</span>'}
            </td>
        </tr>
    `).join('');
}

// ===== 전체 결재 내역 로드 =====
function loadAllApprovals() {
    const approvals = JSON.parse(localStorage.getItem('approvals') || '[]');
    const filter = document.getElementById('allApprovalsFilter').value;
    const list = document.getElementById('allApprovalsList');

    let filtered = approvals;
    if (filter !== 'all') {
        filtered = approvals.filter(a => a.status === filter);
    }

    if (filtered.length === 0) {
        list.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>결재 내역이 없습니다.</p></div>';
        return;
    }

    list.innerHTML = filtered.reverse().map(approval => {
        const requester = getUser(approval.requesterId);
        const processor = approval.processedBy ? getUser(approval.processedBy) : null;
        const assignedApprover = approval.assignedApproverId ? getUser(approval.assignedApproverId) : null;
        
        // 이전 버전 호환성 (단일 파일)
        const files = approval.files || (approval.fileName ? [{name: approval.fileName, data: approval.fileData}] : []);
        const signedFiles = approval.signedFiles || (approval.signedFileName ? [{name: approval.signedFileName, data: approval.signedFileData}] : []);
        
        return `
            <div class="approval-card ${approval.status}">
                <div class="approval-header">
                    <div>
                        <div class="approval-title">${approval.title}</div>
                        <div class="approval-meta">
                            <span><i class="fas fa-user"></i> 신청자: ${requester?.name || '알 수 없음'}</span>
                            ${assignedApprover ? `<span><i class="fas fa-user-tag"></i> 담당자: ${assignedApprover.name}</span>` : ''}
                            <span><i class="fas fa-calendar"></i> ${formatDate(approval.createdAt)}</span>
                            ${processor ? `<span><i class="fas fa-user-check"></i> 처리자: ${processor.name}</span>` : ''}
                        </div>
                    </div>
                    <span class="approval-status ${approval.status}">${getStatusText(approval.status)}</span>
                </div>
                <div class="approval-description">${approval.description}</div>
                ${approval.feedback ? `
                    <div class="approval-feedback">
                        <strong>피드백:</strong>
                        <p>${approval.feedback}</p>
                    </div>
                ` : ''}
                <div class="approval-actions">
                    <button class="btn btn-sm btn-primary" onclick="viewApprovalDetail('${approval.id}')">
                        <i class="fas fa-eye"></i> 상세보기
                    </button>
                    ${files.map((file, idx) => `
                        <button class="btn btn-sm btn-secondary" onclick="downloadFile('${file.data}', '${file.name}')">
                            <i class="fas fa-download"></i> ${files.length > 1 ? `파일 ${idx + 1}` : '파일'}
                        </button>
                    `).join('')}
                    ${signedFiles.map((file, idx) => `
                        <button class="btn btn-sm btn-success" onclick="downloadFile('${file.data}', '${file.name}')">
                            <i class="fas fa-file-signature"></i> ${signedFiles.length > 1 ? `사인 ${idx + 1}` : '사인'}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
}

// ===== 사용자 승인 =====
function approveUser(userId) {
    const pendingUsers = JSON.parse(localStorage.getItem('pendingUsers') || '[]');
    const users = JSON.parse(localStorage.getItem('users') || '[]');

    const userIndex = pendingUsers.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
        const user = pendingUsers[userIndex];
        user.status = 'approved';
        users.push(user);
        pendingUsers.splice(userIndex, 1);

        localStorage.setItem('users', JSON.stringify(users));
        localStorage.setItem('pendingUsers', JSON.stringify(pendingUsers));

        showToast('사용자가 승인되었습니다.', 'success');
        loadPendingUsers();
        updateBadges();
    }
}

// ===== 사용자 반려 =====
function rejectUser(userId) {
    if (!confirm('이 가입 신청을 반려하시겠습니까?')) return;

    const pendingUsers = JSON.parse(localStorage.getItem('pendingUsers') || '[]');
    const userIndex = pendingUsers.findIndex(u => u.id === userId);
    
    if (userIndex !== -1) {
        pendingUsers.splice(userIndex, 1);
        localStorage.setItem('pendingUsers', JSON.stringify(pendingUsers));

        showToast('가입 신청이 반려되었습니다.', 'success');
        loadPendingUsers();
        updateBadges();
    }
}

// ===== 사용자 역할 변경 =====
function changeUserRole(userId, newRole) {
    if (!newRole) return;
    if (!confirm('사용자의 역할을 변경하시겠습니까?')) return;

    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(u => u.id === userId);
    
    if (user) {
        user.role = newRole;
        localStorage.setItem('users', JSON.stringify(users));
        showToast('역할이 변경되었습니다.', 'success');
        loadUserManagement();
    }
}

// ===== 사용자 삭제 =====
function deleteUser(userId) {
    if (!confirm('이 사용자를 삭제하시겠습니까?')) return;

    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex !== -1) {
        users.splice(userIndex, 1);
        localStorage.setItem('users', JSON.stringify(users));
        showToast('사용자가 삭제되었습니다.', 'success');
        loadUserManagement();
    }
}

// ===== 결재 상세보기 =====
function viewApprovalDetail(approvalId) {
    const approvals = JSON.parse(localStorage.getItem('approvals') || '[]');
    const approval = approvals.find(a => a.id === approvalId);
    
    if (!approval) return;

    const requester = getUser(approval.requesterId);
    const processor = approval.processedBy ? getUser(approval.processedBy) : null;
    const assignedApprover = approval.assignedApproverId ? getUser(approval.assignedApproverId) : null;

    // 이전 버전 호환성 (단일 파일)
    const files = approval.files || (approval.fileName ? [{name: approval.fileName, data: approval.fileData}] : []);
    const signedFiles = approval.signedFiles || (approval.signedFileName ? [{name: approval.signedFileName, data: approval.signedFileData}] : []);

    const detailsHtml = `
        <div class="detail-row">
            <label>제목</label>
            <p>${approval.title}</p>
        </div>
        <div class="detail-row">
            <label>내용</label>
            <p>${approval.description}</p>
        </div>
        <div class="detail-row">
            <label>신청자</label>
            <p>${requester?.name || '알 수 없음'} (${requester?.email || ''})</p>
        </div>
        ${assignedApprover ? `
            <div class="detail-row">
                <label>담당 결재자</label>
                <p>${assignedApprover.name} (${assignedApprover.email})</p>
            </div>
        ` : ''}
        <div class="detail-row">
            <label>신청일</label>
            <p>${formatDate(approval.createdAt)}</p>
        </div>
        <div class="detail-row">
            <label>상태</label>
            <p><span class="approval-status ${approval.status}">${getStatusText(approval.status)}</span></p>
        </div>
        ${processor ? `
            <div class="detail-row">
                <label>처리자</label>
                <p>${processor.name} (${processor.email})</p>
            </div>
            <div class="detail-row">
                <label>처리일</label>
                <p>${formatDate(approval.processedAt)}</p>
            </div>
        ` : ''}
        ${approval.feedback ? `
            <div class="detail-row">
                <label>피드백</label>
                <p>${approval.feedback}</p>
            </div>
        ` : ''}
        <div class="detail-row">
            <label>첨부파일 (원본) - ${files.length}개</label>
            <div style="display: flex; flex-direction: column; gap: 10px;">
                ${files.map((file, idx) => `
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <p style="margin: 0; flex: 1;">${file.name}</p>
                        <button class="btn btn-sm btn-secondary" onclick="downloadFile('${file.data}', '${file.name}')">
                            <i class="fas fa-download"></i> 다운로드
                        </button>
                    </div>
                `).join('')}
            </div>
        </div>
        ${signedFiles.length > 0 ? `
            <div class="detail-row">
                <label>사인된 파일 - ${signedFiles.length}개</label>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    ${signedFiles.map((file, idx) => `
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <p style="margin: 0; flex: 1;">${file.name}</p>
                            <button class="btn btn-sm btn-success" onclick="downloadFile('${file.data}', '${file.name}')">
                                <i class="fas fa-file-signature"></i> 다운로드
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}
    `;

    document.getElementById('approvalDetails').innerHTML = detailsHtml;
    document.getElementById('approvalModal').style.display = 'block';
}

// ===== 결재 처리 모달 =====
function showProcessModal(approvalId, action) {
    const approvals = JSON.parse(localStorage.getItem('approvals') || '[]');
    const approval = approvals.find(a => a.id === approvalId);
    
    if (!approval) return;

    const actionText = action === 'approved' ? '승인' : '반려';
    const actionClass = action === 'approved' ? 'success' : 'danger';

    const formHtml = `
        <p>이 결재를 <strong>${actionText}</strong>하시겠습니까?</p>
        <div class="form-group">
            <label>피드백 (선택사항)</label>
            <textarea id="processFeedback" rows="4" placeholder="피드백을 입력하세요"></textarea>
        </div>
        ${action === 'approved' ? `
            <div class="form-group">
                <label>사인된 파일 업로드 (선택사항, 여러 파일 선택 가능)</label>
                <input type="file" id="processSignedFile" accept=".doc,.docx,.hwp,.xls,.xlsx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/x-hwp" multiple>
                <small>사인 또는 결재 완료된 파일을 업로드하면 신청자가 다운로드할 수 있습니다. (여러 파일 선택 가능)</small>
                <div id="signedFileList" class="file-list"></div>
            </div>
        ` : ''}
        <div style="display: flex; gap: 10px; margin-top: 20px;">
            <button class="btn btn-${actionClass}" onclick="processApproval('${approvalId}', '${action}')">
                <i class="fas fa-check"></i> ${actionText}
            </button>
            <button class="btn btn-secondary" onclick="document.getElementById('processModal').style.display='none'">
                <i class="fas fa-times"></i> 취소
            </button>
        </div>
    `;

    document.getElementById('processDetails').innerHTML = formHtml;
    document.getElementById('processModal').style.display = 'block';
    
    // 사인 파일 선택 시 미리보기 이벤트 추가
    if (action === 'approved') {
        const signedFileInput = document.getElementById('processSignedFile');
        signedFileInput.addEventListener('change', function() {
            const files = Array.from(signedFileInput.files);
            const signedFileList = document.getElementById('signedFileList');
            
            if (files.length === 0) {
                signedFileList.innerHTML = '';
                return;
            }
            
            signedFileList.innerHTML = `
                <div style="margin-top: 10px; padding: 10px; background: var(--bg-color); border-radius: 8px;">
                    <strong>선택된 파일 (${files.length}개):</strong>
                    <ul style="margin: 5px 0 0 20px; padding: 0;">
                        ${files.map(file => `<li>${file.name} (${formatFileSize(file.size)})</li>`).join('')}
                    </ul>
                </div>
            `;
        });
    }
}

// ===== 결재 처리 =====
function processApproval(approvalId, action) {
    const feedback = document.getElementById('processFeedback').value;
    const signedFileInput = document.getElementById('processSignedFile');
    const approvals = JSON.parse(localStorage.getItem('approvals') || '[]');
    const approval = approvals.find(a => a.id === approvalId);

    if (!approval) return;

    // 사인된 파일이 업로드되었는지 확인
    if (signedFileInput && signedFileInput.files.length > 0) {
        const files = Array.from(signedFileInput.files);
        
        // 다중 파일 읽기
        const filePromises = files.map(file => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = function(e) {
                    resolve({
                        name: file.name,
                        data: e.target.result
                    });
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        });
        
        Promise.all(filePromises).then(fileResults => {
            // 결재 정보 업데이트
            approval.status = action;
            approval.processedBy = currentUser.id;
            approval.processedAt = new Date().toISOString();
            approval.feedback = feedback;
            approval.signedFiles = fileResults;

            localStorage.setItem('approvals', JSON.stringify(approvals));

            // 신청자에게 알림 생성
            createNotification({
                userId: approval.requesterId,
                type: action,
                title: `결재가 ${action === 'approved' ? '승인' : '반려'}되었습니다`,
                message: `"${approval.title}" 결재가 ${action === 'approved' ? '승인' : '반려'}되었습니다.${fileResults.length > 0 ? ` ${fileResults.length}개의 사인된 파일을 다운로드할 수 있습니다.` : ''}`,
                approvalId: approvalId,
                timestamp: new Date().toISOString()
            });

            const actionText = action === 'approved' ? '승인' : '반려';
            showToast(`결재가 ${actionText}되었습니다.${fileResults.length > 0 ? ` ${fileResults.length}개의 파일이 업로드되었습니다.` : ''}`, 'success');
            
            document.getElementById('processModal').style.display = 'none';
            updateBadges();
            loadPendingApprovals();
        }).catch(error => {
            console.error('파일 업로드 오류:', error);
            showToast('파일 업로드 중 오류가 발생했습니다.', 'error');
        });
    } else {
        // 파일 없이 처리
        approval.status = action;
        approval.processedBy = currentUser.id;
        approval.processedAt = new Date().toISOString();
        approval.feedback = feedback;
        approval.signedFiles = approval.signedFiles || [];

        localStorage.setItem('approvals', JSON.stringify(approvals));

        // 신청자에게 알림 생성
        createNotification({
            userId: approval.requesterId,
            type: action,
            title: `결재가 ${action === 'approved' ? '승인' : '반려'}되었습니다`,
            message: `"${approval.title}" 결재가 ${action === 'approved' ? '승인' : '반려'}되었습니다.`,
            approvalId: approvalId,
            timestamp: new Date().toISOString()
        });

        const actionText = action === 'approved' ? '승인' : '반려';
        showToast(`결재가 ${actionText}되었습니다.`, 'success');
        
        document.getElementById('processModal').style.display = 'none';
        updateBadges();
        loadPendingApprovals();
    }
}

// ===== 파일 다운로드 =====
function downloadFile(fileData, fileName) {
    const link = document.createElement('a');
    link.href = fileData;
    link.download = fileName;
    link.click();
}

// ===== 뱃지 업데이트 =====
function updateBadges() {
    const approvals = JSON.parse(localStorage.getItem('approvals') || '[]');
    const pendingUsers = JSON.parse(localStorage.getItem('pendingUsers') || '[]');

    // 현재 사용자에게 할당된 대기중인 결재 건수
    let pendingCount = approvals.filter(a => a.status === 'pending').length;
    
    // 관리자가 아닌 경우, 자신에게 할당된 결재만 카운트
    if (currentUser && currentUser.role !== 'admin') {
        pendingCount = approvals.filter(a => a.status === 'pending' && a.assignedApproverId === currentUser.id).length;
    }
    
    document.getElementById('pendingCount').textContent = pendingCount;
    
    document.getElementById('pendingUsersCount').textContent = pendingUsers.length;
}

// ===== 유틸리티 함수 =====
function generateId() {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function getUser(userId) {
    return dataCache.users.find(u => u.id === userId);
}

function getRoleText(role) {
    const roles = {
        admin: '관리자',
        approver: '결재자',
        requester: '신청자'
    };
    return roles[role] || role;
}

function getStatusText(status) {
    const statuses = {
        pending: '대기중',
        approved: '승인됨',
        rejected: '반려됨'
    };
    return statuses[status] || status;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.style.display = 'block';

    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

// ===== 관리자 등록 페이지 로드 =====
function loadAdminRegistration() {
    loadAdminsList();
}

// ===== 관리자 목록 로드 =====
function loadAdminsList() {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const admins = users.filter(u => u.role === 'admin');
    const list = document.getElementById('adminsList');

    if (admins.length === 0) {
        list.innerHTML = '<div class="empty-state"><i class="fas fa-user-shield"></i><p>등록된 관리자가 없습니다.</p></div>';
        return;
    }

    list.innerHTML = admins.map(admin => `
        <div class="user-card admin-badge-card">
            <div class="user-info">
                <h4><i class="fas fa-crown"></i> ${admin.name}</h4>
                <p>${admin.email}</p>
                <p>등록일: ${formatDate(admin.createdAt)}</p>
            </div>
            <div class="user-actions">
                ${admins.length > 1 && admin.id !== currentUser.id ? `
                    <button class="btn btn-sm btn-danger" onclick="removeAdmin('${admin.id}')">
                        <i class="fas fa-trash"></i> 삭제
                    </button>
                ` : '<span style="color: white; font-size: 12px;">현재 로그인 중</span>'}
            </div>
        </div>
    `).join('');
}

// ===== 관리자 등록 처리 =====
function handleAdminRegistration(e) {
    e.preventDefault();

    const name = document.getElementById('adminName').value;
    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;
    const passwordConfirm = document.getElementById('adminPasswordConfirm').value;

    // 비밀번호 확인
    if (password !== passwordConfirm) {
        showToast('비밀번호가 일치하지 않습니다.', 'error');
        return;
    }

    // 비밀번호 길이 확인
    if (password.length < 6) {
        showToast('비밀번호는 최소 6자 이상이어야 합니다.', 'error');
        return;
    }

    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const pendingUsers = JSON.parse(localStorage.getItem('pendingUsers') || '[]');

    // 이메일 중복 체크
    if (users.some(u => u.email === email) || pendingUsers.some(u => u.email === email)) {
        showToast('이미 등록된 이메일입니다.', 'error');
        return;
    }

    // 새 관리자 생성
    const newAdmin = {
        id: generateId(),
        name: name,
        email: email,
        password: password,
        role: 'admin',
        status: 'approved',
        createdAt: new Date().toISOString()
    };

    users.push(newAdmin);
    localStorage.setItem('users', JSON.stringify(users));

    showToast('관리자가 성공적으로 등록되었습니다.', 'success');
    
    // 폼 초기화
    document.getElementById('adminRegistrationForm').reset();
    
    // 관리자 목록 새로고침
    loadAdminsList();
}

// ===== 관리자 삭제 =====
function removeAdmin(adminId) {
    if (!confirm('이 관리자를 삭제하시겠습니까?\n\n주의: 관리자 삭제는 신중하게 진행해주세요.')) {
        return;
    }

    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const admins = users.filter(u => u.role === 'admin');

    // 마지막 관리자는 삭제 불가
    if (admins.length <= 1) {
        showToast('최소 1명의 관리자는 유지되어야 합니다.', 'error');
        return;
    }

    // 본인은 삭제 불가
    if (adminId === currentUser.id) {
        showToast('본인 계정은 삭제할 수 없습니다.', 'error');
        return;
    }

    const userIndex = users.findIndex(u => u.id === adminId);
    
    if (userIndex !== -1) {
        users.splice(userIndex, 1);
        localStorage.setItem('users', JSON.stringify(users));
        showToast('관리자가 삭제되었습니다.', 'success');
        loadAdminsList();
    }
}

// ===== 알림 생성 =====
function createNotification(notificationData) {
    const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
    
    const notification = {
        id: generateId(),
        userId: notificationData.userId,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        approvalId: notificationData.approvalId,
        timestamp: notificationData.timestamp,
        read: false
    };
    
    notifications.push(notification);
    localStorage.setItem('notifications', JSON.stringify(notifications));
}

// ===== 알림 패널 토글 =====
function toggleNotificationPanel() {
    const panel = document.getElementById('notificationPanel');
    const isVisible = panel.style.display === 'block';
    
    if (isVisible) {
        panel.style.display = 'none';
    } else {
        panel.style.display = 'block';
        loadNotifications();
    }
}

// ===== 알림 목록 로드 =====
function loadNotifications() {
    const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
    const list = document.getElementById('notificationList');
    
    // 현재 사용자의 알림만 필터링
    const userNotifications = notifications.filter(n => n.userId === currentUser.id)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    if (userNotifications.length === 0) {
        list.innerHTML = '<div class="notification-empty"><i class="fas fa-bell-slash"></i><p>알림이 없습니다.</p></div>';
        return;
    }
    
    list.innerHTML = userNotifications.map(notification => {
        const timeAgo = getTimeAgo(notification.timestamp);
        return `
            <div class="notification-item ${notification.read ? '' : 'unread'} ${notification.type}" onclick="viewNotification('${notification.id}')">
                <div class="notification-item-header">
                    <div class="notification-title">${notification.title}</div>
                    <div class="notification-time">${timeAgo}</div>
                </div>
                <div class="notification-message">${notification.message}</div>
                <div class="notification-actions-btns">
                    <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); viewApprovalFromNotification('${notification.approvalId}')">
                        <i class="fas fa-eye"></i> 결재 보기
                    </button>
                    ${!notification.read ? `
                        <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); markNotificationRead('${notification.id}')">
                            <i class="fas fa-check"></i> 읽음
                        </button>
                    ` : ''}
                    <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); deleteNotification('${notification.id}')">
                        <i class="fas fa-trash"></i> 삭제
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// ===== 알림 읽음 처리 =====
function markNotificationRead(notificationId) {
    const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
    const notification = notifications.find(n => n.id === notificationId);
    
    if (notification) {
        notification.read = true;
        localStorage.setItem('notifications', JSON.stringify(notifications));
        loadNotifications();
        updateNotificationBadge();
    }
}

// ===== 모든 알림 읽음 처리 =====
function markAllNotificationsRead() {
    const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
    
    notifications.forEach(n => {
        if (n.userId === currentUser.id) {
            n.read = true;
        }
    });
    
    localStorage.setItem('notifications', JSON.stringify(notifications));
    loadNotifications();
    updateNotificationBadge();
    showToast('모든 알림을 읽음 처리했습니다.', 'success');
}

// ===== 알림 삭제 =====
function deleteNotification(notificationId) {
    const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
    const index = notifications.findIndex(n => n.id === notificationId);
    
    if (index !== -1) {
        notifications.splice(index, 1);
        localStorage.setItem('notifications', JSON.stringify(notifications));
        loadNotifications();
        updateNotificationBadge();
    }
}

// ===== 모든 알림 삭제 =====
function clearAllNotifications() {
    if (!confirm('모든 알림을 삭제하시겠습니까?')) return;
    
    const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
    const filtered = notifications.filter(n => n.userId !== currentUser.id);
    
    localStorage.setItem('notifications', JSON.stringify(filtered));
    loadNotifications();
    updateNotificationBadge();
    showToast('모든 알림이 삭제되었습니다.', 'success');
}

// ===== 알림에서 결재 보기 =====
function viewNotification(notificationId) {
    markNotificationRead(notificationId);
}

function viewApprovalFromNotification(approvalId) {
    document.getElementById('notificationPanel').style.display = 'none';
    viewApprovalDetail(approvalId);
}

// ===== 알림 배지 업데이트 =====
function updateNotificationBadge() {
    const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
    const unreadCount = notifications.filter(n => n.userId === currentUser.id && !n.read).length;
    
    const badge = document.getElementById('notificationBadge');
    if (unreadCount > 0) {
        badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
        badge.style.display = 'block';
    } else {
        badge.style.display = 'none';
    }
}

// ===== 시간 경과 표시 =====
function getTimeAgo(timestamp) {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;
    
    return formatDate(timestamp);
}

// ===== 자동 새로고침 =====
function startAutoRefresh() {
    // 기존 인터벌이 있으면 제거
    stopAutoRefresh();
    
    // 5초마다 자동 새로고침
    autoRefreshInterval = setInterval(() => {
        if (currentUser && currentPage) {
            // 알림 배지 업데이트
            updateNotificationBadge();
            updateBadges();
            
            // 현재 페이지 자동 새로고침
            refreshCurrentPage();
        }
    }, 5000); // 5초마다 새로고침
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

function refreshCurrentPage() {
    // 현재 페이지에 따라 자동 새로고침
    switch(currentPage) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'myRequests':
            loadMyRequests();
            break;
        case 'pendingApprovals':
            loadPendingApprovals();
            break;
        case 'approvalHistory':
            loadApprovalHistory();
            break;
        case 'adminDashboard':
            loadAdminDashboard();
            break;
        case 'pendingUsers':
            loadPendingUsers();
            break;
        case 'userManagement':
            loadUserManagement();
            break;
        case 'allApprovals':
            loadAllApprovals();
            break;
    }
}