// Dashboard Interactions
const currentUser = checkAuth();
let questionnaireQuestions = [];
let currentUserFilter = '';
let teachersList = []; // 缓存教师列表

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initUI();
    showSection('dashboard');
});

function initUI() {
    document.getElementById('userName').textContent = currentUser.username;
    document.getElementById('userRole').textContent = getRoleLabel(currentUser.role);
    document.getElementById('userAvatar').textContent = currentUser.username.charAt(0).toUpperCase();

    // Show/hide elements based on role
    if (currentUser.role === 'teacher' || currentUser.role === 'admin') {
        document.getElementById('nav-analysis').classList.remove('d-none');
        document.getElementById('btn-create-eval').classList.remove('d-none');
    }
    if (currentUser.role === 'admin') {
        document.getElementById('nav-users').classList.remove('d-none');
        // 加载教师列表供课程管理使用
        loadTeachers();
    }
    if (currentUser.role === 'student') {
        document.getElementById('course-actions').classList.add('d-none');
        document.getElementById('stats-users-card').classList.add('d-none');
    }
    // 教师角色隐藏教师选择（自动分配给自己）
    if (currentUser.role === 'teacher') {
        const teacherGroup = document.getElementById('course-teacher-group');
        if (teacherGroup) teacherGroup.classList.add('d-none');
    }
}

function getRoleLabel(role) {
    const labels = { admin: '管理员', teacher: '教师', student: '学生' };
    return labels[role] || role;
}

// Toast - Bootstrap版本
function showToast(message, type = 'success') {
    const bgClass = type === 'success' ? 'bg-success' : type === 'error' ? 'bg-danger' : 'bg-warning';
    const toastHtml = `
        <div class="toast align-items-center text-white ${bgClass} border-0" role="alert">
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;
    const container = document.querySelector('.toast-container');
    container.insertAdjacentHTML('beforeend', toastHtml);
    const toastEl = container.lastElementChild;
    const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
    toast.show();
    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
}

// 加载教师列表
async function loadTeachers() {
    if (currentUser.role !== 'admin') return;
    try {
        const users = await apiFetch('/users/?role=teacher');
        teachersList = users;
        updateTeacherSelect();
    } catch (e) {
        console.error('加载教师列表失败', e);
    }
}

function updateTeacherSelect(selectedId = '') {
    const select = document.getElementById('course-teacher');
    if (!select) return;
    select.innerHTML = '<option value="">请选择教师...</option>' +
        teachersList.map(t => `<option value="${t.id}" ${t.id == selectedId ? 'selected' : ''}>${t.username}</option>`).join('');
}

// Navigation
function showSection(id) {
    ['dashboard', 'courses', 'evaluations', 'analysis', 'users'].forEach(s => {
        document.getElementById(`section-${s}`).classList.add('d-none');
    });
    document.getElementById(`section-${id}`).classList.remove('d-none');

    // Update sidebar
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.classList.remove('active');
    });
    const activeNav = document.querySelector(`[onclick="showSection('${id}')"]`);
    if (activeNav) {
        activeNav.classList.add('active');
    }

    // Load data
    if (id === 'dashboard') loadStats();
    if (id === 'courses') loadCourses();
    if (id === 'evaluations') loadEvaluations();
    if (id === 'analysis') loadAnalysisPage();
    if (id === 'users') loadUsers();
}

// ==================== Dashboard ====================
async function loadStats() {
    try {
        // 使用与课程管理相同的接口，保持数据一致性
        const [courses, questionnaires] = await Promise.all([
            apiFetch('/courses/'),
            apiFetch('/evaluations/questionnaires/')
        ]);
        document.getElementById('stats-courses').textContent = courses.length;
        document.getElementById('stats-questionnaires').textContent = questionnaires.length;
        document.getElementById('stats-responses').textContent = '-';

        if (currentUser.role === 'admin') {
            const userStats = await apiFetch('/users/statistics/');
            document.getElementById('stats-users').textContent = userStats.total;
        }
    } catch (e) {
        console.error(e);
    }
}

// ==================== Courses ====================
async function loadCourses() {
    try {
        const courses = await apiFetch('/courses/');
        const container = document.getElementById('courses-list');

        if (courses.length === 0) {
            container.innerHTML = '<div class="col-12"><p class="text-muted">暂无课程</p></div>';
            return;
        }

        container.innerHTML = courses.map(c => `
            <div class="col-md-6 col-lg-4">
                <div class="card h-100">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <span class="badge bg-primary">${c.code}</span>
                            ${currentUser.role !== 'student' ? `
                            <div class="btn-group btn-group-sm">
                                <button onclick="editCourse(${c.id})" class="btn btn-outline-primary btn-sm">编辑</button>
                                <button onclick="deleteCourse(${c.id})" class="btn btn-outline-danger btn-sm">删除</button>
                            </div>` : ''}
                        </div>
                        <h5 class="card-title fw-bold">${c.name}</h5>
                        <p class="card-text text-muted small">${c.description || '暂无描述'}</p>
                        <div class="d-flex gap-3 small text-secondary">
                            <span><i class="bi bi-person me-1"></i>${c.teacher_detail?.username || '暂无教师'}</span>
                            <span><i class="bi bi-mortarboard me-1"></i>${c.credits} 学分</span>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        // Update course dropdown for questionnaire
        const select = document.getElementById('q-course');
        select.innerHTML = courses.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    } catch (e) {
        console.error(e);
        showToast('加载课程失败', 'error');
    }
}

function openCourseModal(course = null) {
    document.getElementById('course-modal-title').textContent = course ? '编辑课程' : '添加课程';
    document.getElementById('course-id').value = course?.id || '';
    document.getElementById('course-code').value = course?.code || '';
    document.getElementById('course-name').value = course?.name || '';
    document.getElementById('course-desc').value = course?.description || '';
    document.getElementById('course-credits').value = course?.credits || 3;

    // 设置教师选择（仅管理员可见）
    if (currentUser.role === 'admin') {
        updateTeacherSelect(course?.teacher || '');
    }

    // 使用Bootstrap Modal API
    const modal = new bootstrap.Modal(document.getElementById('course-modal'));
    modal.show();
}

function closeCourseModal() {
    const modal = bootstrap.Modal.getInstance(document.getElementById('course-modal'));
    if (modal) modal.hide();
}

async function saveCourse() {
    const id = document.getElementById('course-id').value;
    const data = {
        code: document.getElementById('course-code').value,
        name: document.getElementById('course-name').value,
        description: document.getElementById('course-desc').value,
        credits: parseInt(document.getElementById('course-credits').value)
    };

    // 管理员可以选择教师
    if (currentUser.role === 'admin') {
        const teacherId = document.getElementById('course-teacher').value;
        if (teacherId) {
            data.teacher = parseInt(teacherId);
        } else {
            data.teacher = null;
        }
    }

    if (!data.code || !data.name) {
        showToast('请填写课程代码和名称', 'warning');
        return;
    }

    try {
        if (id) {
            await apiFetch(`/courses/${id}/`, { method: 'PUT', body: JSON.stringify(data) });
            showToast('课程更新成功', 'success');
        } else {
            await apiFetch('/courses/', { method: 'POST', body: JSON.stringify(data) });
            showToast('课程添加成功', 'success');
        }
        closeCourseModal();
        loadCourses();
        loadStats(); // 刷新统计
    } catch (e) {
        showToast('保存失败', 'error');
    }
}

async function editCourse(id) {
    try {
        const course = await apiFetch(`/courses/${id}/`);
        openCourseModal(course);
    } catch (e) {
        showToast('获取课程信息失败', 'error');
    }
}

// 确认删除弹窗
function showConfirmModal(title, message, onConfirm) {
    document.getElementById('confirm-modal-title').textContent = title;
    document.getElementById('confirm-modal-message').textContent = message;
    const btn = document.getElementById('confirm-modal-btn');
    // 移除旧的事件监听器
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener('click', () => {
        const modal = bootstrap.Modal.getInstance(document.getElementById('confirm-modal'));
        modal.hide();
        onConfirm();
    });
    const modal = new bootstrap.Modal(document.getElementById('confirm-modal'));
    modal.show();
}

async function deleteCourse(id) {
    showConfirmModal('删除课程', '确定要删除此课程吗？此操作不可撤销。', async () => {
        try {
            await apiFetch(`/courses/${id}/`, { method: 'DELETE' });
            showToast('课程已删除', 'success');
            loadCourses();
            loadStats();
        } catch (e) {
            showToast('删除失败', 'error');
        }
    });
}

async function exportCourses() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_BASE}/courses/export/`, {
            headers: { 'Authorization': `Token ${token}` }
        });
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'courses.csv';
            a.click();
            window.URL.revokeObjectURL(url);
            showToast('导出成功', 'success');
        } else {
            showToast('导出失败', 'error');
        }
    } catch (e) {
        showToast('导出失败', 'error');
    }
}

async function importCourses(input) {
    const file = input.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/courses/import_csv/`, {
            method: 'POST',
            headers: { 'Authorization': `Token ${token}` },
            body: formData
        });
        const result = await response.json();
        if (response.ok) {
            showToast(result.message, 'success');
            loadCourses();
        } else {
            showToast(result.error || '导入失败', 'error');
        }
    } catch (e) {
        showToast('导入失败', 'error');
    }
    input.value = '';
}

// ==================== Evaluations ====================
async function loadEvaluations() {
    try {
        const evals = await apiFetch('/evaluations/questionnaires/');
        const container = document.getElementById('evaluations-list');

        if (evals.length === 0) {
            container.innerHTML = '<p class="text-muted">暂无问卷</p>';
            return;
        }

        const statusLabels = { draft: '草稿', published: '已发布', closed: '已关闭' };

        container.innerHTML = evals.map(e => `
            <div class="card mb-3">
                <div class="card-body d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <div class="d-flex align-items-center gap-2 mb-2">
                            <h5 class="card-title fw-bold mb-0">${e.title}</h5>
                            <span class="badge status-${e.status}">${statusLabels[e.status]}</span>
                        </div>
                        <p class="card-text text-muted small mb-1">${e.description || '暂无描述'}</p>
                        <p class="card-text text-secondary small">问题数: ${e.questions?.length || 0}</p>
                    </div>
                    <div class="d-flex gap-2">
                        ${currentUser.role === 'student' ? `
                            <button onclick="openEvaluation(${e.id})" class="btn btn-primary btn-sm">填写问卷</button>
                        ` : `
                            <button onclick="viewStats(${e.id})" class="btn btn-info btn-sm text-white">统计</button>
                            ${e.status === 'draft' ? `<button onclick="publishQuestionnaire(${e.id})" class="btn btn-success btn-sm">发布</button>` : ''}
                            ${e.status === 'published' ? `<button onclick="closeQuestionnaire(${e.id})" class="btn btn-warning btn-sm">关闭</button>` : ''}
                            ${e.status === 'closed' ? `<button onclick="reopenQuestionnaire(${e.id})" class="btn btn-success btn-sm">重新开启</button>` : ''}
                            <button onclick="deleteQuestionnaire(${e.id})" class="btn btn-danger btn-sm">删除</button>
                        `}
                    </div>
                </div>
            </div>
        `).join('');
    } catch (e) {
        console.error(e);
        showToast('加载问卷失败', 'error');
    }
}

function openQuestionnaireModal() {
    questionnaireQuestions = [];
    document.getElementById('q-title').value = '';
    document.getElementById('q-desc').value = '';
    renderQuestionsPreview();
    const modal = new bootstrap.Modal(document.getElementById('questionnaire-modal'));
    modal.show();
}

function closeQuestionnaireModal() {
    const modal = bootstrap.Modal.getInstance(document.getElementById('questionnaire-modal'));
    if (modal) modal.hide();
}

function openQuestionModal() {
    document.getElementById('new-q-type').value = 'rating';
    document.getElementById('new-q-text').value = '';
    document.getElementById('new-q-choices').value = '';
    document.getElementById('choices-input').classList.add('d-none');
    const modal = new bootstrap.Modal(document.getElementById('question-modal'));
    modal.show();
}

function closeQuestionModal() {
    const modal = bootstrap.Modal.getInstance(document.getElementById('question-modal'));
    if (modal) modal.hide();
}

function toggleChoicesInput() {
    const type = document.getElementById('new-q-type').value;
    document.getElementById('choices-input').classList.toggle('d-none', type !== 'choice');
}

function addQuestion() {
    const type = document.getElementById('new-q-type').value;
    const text = document.getElementById('new-q-text').value.trim();
    const choices = document.getElementById('new-q-choices').value.trim();

    if (!text) {
        showToast('请输入问题内容', 'warning');
        return;
    }
    if (type === 'choice' && !choices) {
        showToast('请输入选项', 'warning');
        return;
    }

    questionnaireQuestions.push({ text, type, choices, order: questionnaireQuestions.length + 1 });
    renderQuestionsPreview();
    closeQuestionModal();
    showToast('问题已添加', 'success');
}

function removeQuestion(idx) {
    questionnaireQuestions.splice(idx, 1);
    questionnaireQuestions.forEach((q, i) => q.order = i + 1);
    renderQuestionsPreview();
}

function renderQuestionsPreview() {
    const typeLabels = { rating: '评分', text: '文本', choice: '选择' };
    const container = document.getElementById('questions-container');

    if (questionnaireQuestions.length === 0) {
        container.innerHTML = '<p class="text-muted small">暂无问题，请点击上方添加</p>';
        return;
    }

    container.innerHTML = questionnaireQuestions.map((q, idx) => `
        <div class="border p-3 rounded bg-light d-flex justify-content-between align-items-start mb-2">
            <div>
                <p class="fw-medium mb-1">${idx + 1}. ${q.text} <span class="small text-muted">(${typeLabels[q.type]})</span></p>
                ${q.choices ? `<p class="small text-muted mb-0">选项: ${q.choices}</p>` : ''}
            </div>
            <button onclick="removeQuestion(${idx})" class="btn btn-link text-danger btn-sm p-0">删除</button>
        </div>
    `).join('');
}

async function saveQuestionnaire() {
    const title = document.getElementById('q-title').value.trim();
    const description = document.getElementById('q-desc').value.trim();
    const course = document.getElementById('q-course').value;

    if (!title || !course) {
        showToast('请填写标题并选择课程', 'warning');
        return;
    }
    if (questionnaireQuestions.length === 0) {
        showToast('请至少添加一个问题', 'warning');
        return;
    }

    const payload = {
        title,
        description,
        course,
        status: 'published',
        questions: questionnaireQuestions.map(q => ({
            text: q.text,
            question_type: q.type,
            choices: q.choices || '',
            order: q.order
        }))
    };

    try {
        await apiFetch('/evaluations/questionnaires/', { method: 'POST', body: JSON.stringify(payload) });
        showToast('问卷发布成功', 'success');
        closeQuestionnaireModal();
        loadEvaluations();
    } catch (e) {
        showToast('发布失败', 'error');
    }
}

async function publishQuestionnaire(id) {
    try {
        await apiFetch(`/evaluations/questionnaires/${id}/publish/`, { method: 'POST' });
        showToast('问卷已发布', 'success');
        loadEvaluations();
    } catch (e) {
        showToast('发布失败', 'error');
    }
}

async function closeQuestionnaire(id) {
    try {
        await apiFetch(`/evaluations/questionnaires/${id}/close/`, { method: 'POST' });
        showToast('问卷已关闭', 'success');
        loadEvaluations();
    } catch (e) {
        showToast('关闭失败', 'error');
    }
}

async function reopenQuestionnaire(id) {
    try {
        await apiFetch(`/evaluations/questionnaires/${id}/reopen/`, { method: 'POST' });
        showToast('问卷已重新开启', 'success');
        loadEvaluations();
    } catch (e) {
        showToast('重新开启失败', 'error');
    }
}

async function deleteQuestionnaire(id) {
    showConfirmModal('删除问卷', '确定要删除此问卷吗？此操作不可撤销。', async () => {
        try {
            await apiFetch(`/evaluations/questionnaires/${id}/`, { method: 'DELETE' });
            showToast('问卷已删除', 'success');
            loadEvaluations();
            loadStats();
        } catch (e) {
            showToast('删除失败', 'error');
        }
    });
}

function openEvaluation(id) {
    window.location.href = `evaluation_form.html?id=${id}`;
}

async function viewStats(id) {
    try {
        const stats = await apiFetch(`/evaluations/questionnaires/${id}/statistics/`);
        document.getElementById('stats-modal-title').textContent = stats.questionnaire;

        let html = `<p class="text-muted mb-4">总响应数: <strong>${stats.total_responses}</strong></p>`;

        stats.questions.forEach(q => {
            html += `<div class="mb-4 p-3 bg-light rounded">
                <h6 class="fw-medium mb-2">${q.text} <span class="small text-muted">(${q.type})</span></h6>`;

            if (q.type === 'rating') {
                html += `<p class="h4 fw-bold text-primary">${q.average || 0} / 5</p>`;
                if (q.distribution) {
                    html += `<div class="d-flex gap-2 mt-2">`;
                    for (let i = 1; i <= 5; i++) {
                        html += `<span class="badge bg-secondary">${i}星: ${q.distribution[i] || 0}</span>`;
                    }
                    html += `</div>`;
                }
            } else if (q.type === 'choice' && q.counts) {
                html += `<div class="d-flex flex-column gap-1">`;
                Object.entries(q.counts).forEach(([choice, count]) => {
                    html += `<div class="d-flex justify-content-between small"><span>${choice}</span><span class="fw-medium">${count}</span></div>`;
                });
                html += `</div>`;
            } else if (q.type === 'text' && q.answers) {
                html += `<ul class="list-unstyled small text-muted">`;
                q.answers.forEach(a => {
                    html += `<li class="bg-white p-2 rounded border mb-1">${a}</li>`;
                });
                html += `</ul>`;
            }
            html += `</div>`;
        });

        document.getElementById('stats-modal-content').innerHTML = html;
        const modal = new bootstrap.Modal(document.getElementById('stats-modal'));
        modal.show();
    } catch (e) {
        showToast('加载统计失败', 'error');
    }
}

function closeStatsModal() {
    const modal = bootstrap.Modal.getInstance(document.getElementById('stats-modal'));
    if (modal) modal.hide();
}

// ==================== Analysis ====================
async function loadAnalysisPage() {
    try {
        const questionnaires = await apiFetch('/evaluations/questionnaires/');
        const select = document.getElementById('analysis-questionnaire-select');
        select.innerHTML = '<option value="">请选择问卷...</option>' +
            questionnaires.map(q => `<option value="${q.id}">${q.title}</option>`).join('');
    } catch (e) {
        console.error(e);
    }
}

async function loadQuestionnaireStats(id) {
    if (!id) {
        document.getElementById('analysis-content').innerHTML = '';
        return;
    }

    const container = document.getElementById('analysis-content');
    container.innerHTML = '<div class="col-12"><p class="text-muted">加载中...</p></div>';

    try {
        const stats = await apiFetch(`/evaluations/questionnaires/${id}/statistics/`);

        if (stats.total_responses === 0) {
            container.innerHTML = '<div class="col-12"><p class="text-muted">暂无响应数据</p></div>';
            return;
        }

        container.innerHTML = '';

        // Create charts for rating and choice questions
        stats.questions.forEach((q, idx) => {
            if (q.type === 'rating' || q.type === 'choice') {
                const card = document.createElement('div');
                card.className = 'col-md-6';
                card.innerHTML = `
                    <div class="card">
                        <div class="card-body">
                            <h6 class="card-title fw-medium mb-3">${q.text}</h6>
                            <canvas id="chart-${idx}"></canvas>
                        </div>
                    </div>
                `;
                container.appendChild(card);

                const ctx = document.getElementById(`chart-${idx}`).getContext('2d');

                if (q.type === 'rating' && q.distribution) {
                    new Chart(ctx, {
                        type: 'bar',
                        data: {
                            labels: ['1星', '2星', '3星', '4星', '5星'],
                            datasets: [{
                                label: '响应数',
                                data: [q.distribution['1'] || 0, q.distribution['2'] || 0, q.distribution['3'] || 0, q.distribution['4'] || 0, q.distribution['5'] || 0],
                                backgroundColor: 'rgba(111, 66, 193, 0.5)',
                                borderColor: 'rgba(111, 66, 193, 1)',
                                borderWidth: 1
                            }]
                        },
                        options: { scales: { y: { beginAtZero: true } } }
                    });
                } else if (q.type === 'choice' && q.counts) {
                    new Chart(ctx, {
                        type: 'pie',
                        data: {
                            labels: Object.keys(q.counts),
                            datasets: [{
                                data: Object.values(q.counts),
                                backgroundColor: ['rgba(255, 99, 132, 0.5)', 'rgba(54, 162, 235, 0.5)', 'rgba(255, 206, 86, 0.5)', 'rgba(75, 192, 192, 0.5)']
                            }]
                        }
                    });
                }
            }
        });

        if (container.children.length === 0) {
            container.innerHTML = '<div class="col-12"><p class="text-muted">该问卷没有可视化的问题类型</p></div>';
        }
    } catch (e) {
        container.innerHTML = '<div class="col-12"><p class="text-danger">加载失败</p></div>';
    }
}

// ==================== Users (Admin) ====================
async function loadUsers(role = '') {
    if (currentUser.role !== 'admin') return;

    try {
        const url = role ? `/users/?role=${role}` : '/users/';
        const users = await apiFetch(url);
        const tbody = document.getElementById('users-list');

        tbody.innerHTML = users.map(u => `
            <tr>
                <td class="px-3 py-2">${u.username}</td>
                <td class="px-3 py-2 text-muted">${u.email || '-'}</td>
                <td class="px-3 py-2">
                    <span class="badge ${u.role === 'admin' ? 'bg-danger' : u.role === 'teacher' ? 'bg-primary' : 'bg-success'}">${getRoleLabel(u.role)}</span>
                </td>
                <td class="px-3 py-2">
                    <button onclick="editUser(${u.id})" class="btn btn-link btn-sm text-primary p-0 me-2">编辑</button>
                    <button onclick="resetUserPassword(${u.id})" class="btn btn-link btn-sm text-warning p-0 me-2">重置密码</button>
                    <button onclick="deleteUser(${u.id})" class="btn btn-link btn-sm text-danger p-0">删除</button>
                </td>
            </tr>
        `).join('');
    } catch (e) {
        console.error(e);
        showToast('加载用户失败', 'error');
    }
}

function filterUsers(role) {
    currentUserFilter = role;
    loadUsers(role);
}

function openUserModal(user = null) {
    document.getElementById('user-modal-title').textContent = user ? '编辑用户' : '添加用户';
    document.getElementById('user-id').value = user?.id || '';
    document.getElementById('user-username').value = user?.username || '';
    document.getElementById('user-email').value = user?.email || '';
    document.getElementById('user-password').value = '';
    document.getElementById('user-role').value = user?.role || 'student';
    const modal = new bootstrap.Modal(document.getElementById('user-modal'));
    modal.show();
}

function closeUserModal() {
    const modal = bootstrap.Modal.getInstance(document.getElementById('user-modal'));
    if (modal) modal.hide();
}

async function saveUser() {
    const id = document.getElementById('user-id').value;
    const data = {
        username: document.getElementById('user-username').value.trim(),
        email: document.getElementById('user-email').value.trim(),
        role: document.getElementById('user-role').value
    };
    const password = document.getElementById('user-password').value;
    if (password) data.password = password;

    if (!data.username) {
        showToast('请填写用户名', 'warning');
        return;
    }

    try {
        if (id) {
            await apiFetch(`/users/${id}/`, { method: 'PUT', body: JSON.stringify(data) });
            showToast('用户更新成功', 'success');
        } else {
            await apiFetch('/users/', { method: 'POST', body: JSON.stringify(data) });
            showToast('用户添加成功', 'success');
        }
        closeUserModal();
        loadUsers(currentUserFilter);
    } catch (e) {
        showToast('保存失败', 'error');
    }
}

async function editUser(id) {
    try {
        const user = await apiFetch(`/users/${id}/`);
        openUserModal(user);
    } catch (e) {
        showToast('获取用户信息失败', 'error');
    }
}

async function resetUserPassword(id) {
    const newPassword = prompt('请输入新密码 (留空使用默认密码 password123):') || 'password123';
    try {
        await apiFetch(`/users/${id}/reset_password/`, { method: 'POST', body: JSON.stringify({ password: newPassword }) });
        showToast('密码已重置', 'success');
    } catch (e) {
        showToast('重置失败', 'error');
    }
}

async function deleteUser(id) {
    showConfirmModal('删除用户', '确定要删除此用户吗？此操作不可撤销。', async () => {
        try {
            await apiFetch(`/users/${id}/`, { method: 'DELETE' });
            showToast('用户已删除', 'success');
            loadUsers(currentUserFilter);
        } catch (e) {
            showToast('删除失败', 'error');
        }
    });
}

// Expose functions globally
window.showSection = showSection;
window.showToast = showToast;
window.openCourseModal = openCourseModal;
window.closeCourseModal = closeCourseModal;
window.saveCourse = saveCourse;
window.editCourse = editCourse;
window.deleteCourse = deleteCourse;
window.exportCourses = exportCourses;
window.importCourses = importCourses;
window.openQuestionnaireModal = openQuestionnaireModal;
window.closeQuestionnaireModal = closeQuestionnaireModal;
window.openQuestionModal = openQuestionModal;
window.closeQuestionModal = closeQuestionModal;
window.toggleChoicesInput = toggleChoicesInput;
window.addQuestion = addQuestion;
window.removeQuestion = removeQuestion;
window.saveQuestionnaire = saveQuestionnaire;
window.publishQuestionnaire = publishQuestionnaire;
window.closeQuestionnaire = closeQuestionnaire;
window.reopenQuestionnaire = reopenQuestionnaire;
window.deleteQuestionnaire = deleteQuestionnaire;
window.openEvaluation = openEvaluation;
window.viewStats = viewStats;
window.closeStatsModal = closeStatsModal;
window.loadQuestionnaireStats = loadQuestionnaireStats;
window.loadUsers = loadUsers;
window.filterUsers = filterUsers;
window.openUserModal = openUserModal;
window.closeUserModal = closeUserModal;
window.saveUser = saveUser;
window.editUser = editUser;
window.resetUserPassword = resetUserPassword;
window.deleteUser = deleteUser;
window.loadTeachers = loadTeachers;
window.showConfirmModal = showConfirmModal;
