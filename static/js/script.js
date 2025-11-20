// Əsas dəyişənlər
let currentUser = null;
let currentQuestions = [];
let currentQuestionIndex = 0;
let isAdmin = false;

// Tema dəyişdirici
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-bs-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    html.setAttribute('data-bs-theme', newTheme);
    
    // Düymə ikonunu dəyiş
    const themeButton = document.querySelector('.theme-switch button');
    const icon = themeButton.querySelector('i');
    icon.className = newTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    
    // Yadda saxla
    localStorage.setItem('theme', newTheme);
}

// Tema yüklə
function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-bs-theme', savedTheme);
    
    const themeButton = document.querySelector('.theme-switch button');
    if (themeButton) {
        const icon = themeButton.querySelector('i');
        icon.className = savedTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    }
}

// Modal göstəriciləri
function showStudentLogin() {
    const modal = new bootstrap.Modal(document.getElementById('studentLoginModal'));
    modal.show();
}

function showAdminLogin() {
    const modal = new bootstrap.Modal(document.getElementById('adminLoginModal'));
    modal.show();
}

// Şagird qeydiyyatı
document.getElementById('studentRegistrationForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const fullName = document.getElementById('fullName').value;
    const username = document.getElementById('username').value;
    
    const userData = {
        user_id: Date.now(),
        username: username,
        full_name: fullName
    };
    
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            currentUser = userData;
            showStudentDashboard();
            bootstrap.Modal.getInstance(document.getElementById('studentLoginModal')).hide();
            loadStudentStats();
        } else {
            alert('Qeydiyyat zamanı xəta baş verdi: ' + (result.error || 'Naməlum xəta'));
        }
    } catch (error) {
        console.error('Qeydiyyat xətası:', error);
        alert('Qeydiyyat zamanı xəta baş verdi');
    }
});

// Admin girişi
document.getElementById('adminLoginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const password = document.getElementById('adminPassword').value;
    const adminPassword = 'Az01.24aZ'; // Admin parolu
    
    if (password === adminPassword) {
        isAdmin = true;
        showAdminDashboard();
        bootstrap.Modal.getInstance(document.getElementById('adminLoginModal')).hide();
    } else {
        alert('Yanlış parol!');
    }
});

// Şagird panelini göstər
function showStudentDashboard() {
    document.getElementById('studentDashboard').classList.remove('student-dashboard');
    document.getElementById('studentDashboard').style.display = 'block';
    document.getElementById('studentName').textContent = currentUser.full_name;
    
    // Digər səhifələri gizlət
    document.getElementById('heroSection').style.display = 'none';
    document.getElementById('featuresSection').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'none';
}

// Admin panelini göstər
function showAdminDashboard() {
    document.getElementById('adminDashboard').classList.remove('student-dashboard');
    document.getElementById('adminDashboard').style.display = 'block';
    
    // Digər səhifələri gizlət
    document.getElementById('heroSection').style.display = 'none';
    document.getElementById('featuresSection').style.display = 'none';
    document.getElementById('studentDashboard').style.display = 'none';
}

// Şagird statistikasını yüklə
async function loadStudentStats() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`/api/student/stats/${currentUser.user_id}`);
        const stats = await response.json();
        
        if (!stats.error) {
            document.getElementById('totalScore').textContent = stats.total_score;
            document.getElementById('monthlyScore').textContent = stats.monthly_score;
            document.getElementById('accuracy').textContent = stats.accuracy + '%';
        }
    } catch (error) {
        console.error('Statistika yükləmə xətası:', error);
    }
}

// Gündəlik sualları göstər
async function showDailyQuestions() {
    const today = new Date().toISOString().split('T')[0];
    
    try {
        const response = await fetch(`/api/daily-question/${today}`);
        const question = await response.json();
        
        if (question.error) {
            document.getElementById('contentArea').innerHTML = `
                <div class="stats-card">
                    <h4><i class="fas fa-info-circle"></i> Bu gün üçün sual yoxdur</h4>
                    <p>Zəhmət olmasa daha sonra yoxlayın və ya dərəcəli testlərə keçin.</p>
                </div>
            `;
            return;
        }
        
        displayQuestion(question, 'daily');
    } catch (error) {
        console.error('Sual gətirilmə xətası:', error);
        showError('Sual gətirilərkən xəta baş verdi');
    }
}

// Dərəcəli sualları göstər
function showGradedQuestions() {
    const content = `
        <div class="stats-card">
            <h4><i class="fas fa-chart-line"></i> Dərəcəli Testlər</h4>
            <p>Çətinlik səviyyəsini seçin:</p>
            <div class="row">
                <div class="col-md-4">
                    <button class="btn btn-success w-100 mb-2" onclick="loadGradedQuestions('Asan')">
                        <i class="fas fa-circle"></i> Asan
                    </button>
                </div>
                <div class="col-md-4">
                    <button class="btn btn-warning w-100 mb-2" onclick="loadGradedQuestions('Orta')">
                        <i class="fas fa-circle"></i> Orta
                    </button>
                </div>
                <div class="col-md-4">
                    <button class="btn btn-danger w-100 mb-2" onclick="loadGradedQuestions('Çətin')">
                        <i class="fas fa-circle"></i> Çətin
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('contentArea').innerHTML = content;
}

// Dərəcəli sualları yüklə
async function loadGradedQuestions(difficulty) {
    try {
        const response = await fetch(`/api/graded-questions/${difficulty}?user_id=${currentUser.user_id}`);
        const questions = await response.json();
        
        if (questions.error) {
            showError(questions.error);
            return;
        }
        
        if (questions.length === 0) {
            document.getElementById('contentArea').innerHTML = `
                <div class="stats-card">
                    <h4><i class="fas fa-check-circle"></i> ${difficulty} çətinlikdə sual qalmayıb</h4>
                    <p>Bütün sualları cavablandırmısınız! Digər çətinlik səviyyələrini sınayın.</p>
                </div>
            `;
            return;
        }
        
        currentQuestions = questions;
        currentQuestionIndex = 0;
        displayQuestion(questions[0], 'graded');
    } catch (error) {
        console.error('Sual yükləmə xətası:', error);
        showError('Sual yüklənərkən xəta baş verdi');
    }
}

// Sualı göstər
function displayQuestion(question, type) {
    const questionNumber = type === 'graded' ? `${currentQuestionIndex + 1}/${currentQuestions.length}` : '';
    const difficulty = type === 'graded' ? `<span class="badge bg-${getDifficultyColor(question.difficulty)}">${question.difficulty}</span>` : '';
    
    const content = `
        <div class="stats-card">
            <h4>${type === 'daily' ? '📅 Gündəlik Sual' : '🎯 Dərəcəli Sual'} ${questionNumber} ${difficulty}</h4>
            <div class="question-container">
                <p><strong>Sual:</strong> ${question.question}</p>
                
                ${question.image_path ? `
                    <div class="text-center mb-3">
                        <img src="/uploads/${question.image_path}" alt="Sual şəkli" class="img-fluid" style="max-height: 300px;">
                    </div>
                ` : ''}
                
                <div class="mb-3">
                    <label class="form-label">Cavabınızı daxil edin (A, B, C, D):</label>
                    <input type="text" class="form-control" id="userAnswer" maxlength="1" 
                           style="text-transform:uppercase" placeholder="A" autocomplete="off">
                </div>
                
                <button class="btn btn-primary" onclick="checkAnswer(${question.id}, '${type}')">
                    <i class="fas fa-check"></i> Cavabı Yoxla
                </button>
                
                ${type === 'graded' ? `
                    <button class="btn btn-outline-secondary ms-2" onclick="skipQuestion()">
                        <i class="fas fa-forward"></i> Növbəti Sual
                    </button>
                ` : ''}
            </div>
        </div>
    `;
    
    document.getElementById('contentArea').innerHTML = content;
    document.getElementById('userAnswer').focus();
}

// Çətinlik rəngi
function getDifficultyColor(difficulty) {
    const colors = {
        'Asan': 'success',
        'Orta': 'warning', 
        'Çətin': 'danger'
    };
    return colors[difficulty] || 'secondary';
}

// Cavabı yoxla
async function checkAnswer(questionId, questionType) {
    const userAnswer = document.getElementById('userAnswer').value.toUpperCase();
    
    if (!['A', 'B', 'C', 'D'].includes(userAnswer)) {
        alert('Zəhmət olmasa A, B, C və ya D hərflərindən birini daxil edin');
        return;
    }
    
    try {
        const response = await fetch('/api/check-answer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                question_id: questionId,
                question_type: questionType,
                user_answer: userAnswer,
                user_id: currentUser.user_id
            })
        });
        
        const result = await response.json();
        
        let resultHtml = '';
        if (result.correct) {
            resultHtml = `
                <div class="alert alert-success">
                    <h4><i class="fas fa-check-circle"></i> Təbriklər! Düzgün cavab</h4>
                    <p><strong>İzah:</strong> ${result.explanation}</p>
                    <p><strong>Qazandığınız bal:</strong> ${result.score_earned}</p>
                </div>
            `;
        } else {
            resultHtml = `
                <div class="alert alert-danger">
                    <h4><i class="fas fa-times-circle"></i> Yanlış cavab</h4>
                    <p><strong>Düzgün cavab:</strong> ${result.correct_answer}</p>
                    <p><strong>İzah:</strong> ${result.explanation}</p>
                </div>
            `;
        }
        
        // Nəticəni göstər
        document.getElementById('contentArea').innerHTML += resultHtml;
        
        // Statistikaları yenilə
        loadStudentStats();
        
        // Dərəcəli suallar üçün növbəti suala keç
        if (questionType === 'graded' && currentQuestions.length > currentQuestionIndex + 1) {
            setTimeout(() => {
                currentQuestionIndex++;
                displayQuestion(currentQuestions[currentQuestionIndex], 'graded');
            }, 3000);
        }
        
    } catch (error) {
        console.error('Cavab yoxlama xətası:', error);
        alert('Cavab yoxlanılarkən xəta baş verdi');
    }
}

// Sualı keç
function skipQuestion() {
    if (currentQuestions.length > currentQuestionIndex + 1) {
        currentQuestionIndex++;
        displayQuestion(currentQuestions[currentQuestionIndex], 'graded');
    } else {
        document.getElementById('contentArea').innerHTML = `
            <div class="stats-card">
                <h4><i class="fas fa-flag-checkered"></i> Test bitdi!</h4>
                <p>Bütün sualları nəzərdən keçirdiniz.</p>
                <button class="btn btn-primary" onclick="showGradedQuestions()">
                    Digər Testlər
                </button>
            </div>
        `;
    }
}

// Statistika göstər
function showStatistics() {
    const content = `
        <div class="stats-card">
            <h4><i class="fas fa-chart-bar"></i> Statistika</h4>
            <div id="statsContent">
                <div class="text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Yüklənir...</span>
                    </div>
                    <p>Statistika yüklənir...</p>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('contentArea').innerHTML = content;
    loadDetailedStats();
}

// Ətraflı statistika
async function loadDetailedStats() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`/api/student/stats/${currentUser.user_id}`);
        const stats = await response.json();
        
        if (stats.error) {
            document.getElementById('statsContent').innerHTML = `
                <div class="alert alert-danger">
                    <p>Statistika yüklənərkən xəta baş verdi: ${stats.error}</p>
                </div>
            `;
            return;
        }
        
        const statsHtml = `
            <div class="row">
                <div class="col-md-6">
                    <div class="stats-card mb-3">
                        <h5><i class="fas fa-trophy text-warning"></i> Ballar</h5>
                        <p><strong>Ümumi Bal:</strong> ${stats.total_score}</p>
                        <p><strong>Bu Ay Balı:</strong> ${stats.monthly_score}</p>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="stats-card mb-3">
                        <h5><i class="fas fa-target text-success"></i> Dəqiqlik</h5>
                        <p><strong>Ümumi Dəqiqlik:</strong> ${stats.accuracy}%</p>
                        <p><strong>Cavablanmış Sual:</strong> ${stats.total_answered}</p>
                        <p><strong>Düzgün Cavab:</strong> ${stats.correct_answers}</p>
                    </div>
                </div>
            </div>
            <div class="progress mb-3">
                <div class="progress-bar bg-success" role="progressbar" 
                     style="width: ${stats.accuracy}%" 
                     aria-valuenow="${stats.accuracy}" aria-valuemin="0" aria-valuemax="100">
                    ${stats.accuracy}%
                </div>
            </div>
        `;
        
        document.getElementById('statsContent').innerHTML = statsHtml;
    } catch (error) {
        console.error('Statistika yükləmə xətası:', error);
        showError('Statistika yüklənərkən xəta baş verdi');
    }
}

// Reyting göstər
function showRating() {
    const content = `
        <div class="stats-card">
            <h4><i class="fas fa-trophy"></i> Reyting</h4>
            <ul class="nav nav-tabs" id="ratingTabs" role="tablist">
                <li class="nav-item" role="presentation">
                    <button class="nav-link active" id="monthly-tab" data-bs-toggle="tab" 
                            data-bs-target="#monthly" type="button" role="tab">
                        Bu Ay
                    </button>
                </li>
                <li class="nav-item" role="presentation">
                    <button class="nav-link" id="total-tab" data-bs-toggle="tab" 
                            data-bs-target="#total" type="button" role="tab">
                        Ümumi
                    </button>
                </li>
            </ul>
            <div class="tab-content mt-3" id="ratingContent">
                <div class="tab-pane fade show active" id="monthly" role="tabpanel">
                    <div class="text-center">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Yüklənir...</span>
                        </div>
                        <p>Reyting yüklənir...</p>
                    </div>
                </div>
                <div class="tab-pane fade" id="total" role="tabpanel">
                    <!-- Ümumi reyting burada göstəriləcək -->
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('contentArea').innerHTML = content;
    loadRating('monthly');
    
    // Tab dəyişdikdə
    document.getElementById('monthly-tab').addEventListener('click', () => loadRating('monthly'));
    document.getElementById('total-tab').addEventListener('click', () => loadRating('total'));
}

// Reyting yüklə
async function loadRating(period) {
    try {
        const response = await fetch(`/api/rating/${period}`);
        const rating = await response.json();
        
        if (rating.error) {
            document.getElementById(period).innerHTML = `
                <div class="alert alert-danger">
                    <p>Reyting yüklənərkən xəta baş verdi: ${rating.error}</p>
                </div>
            `;
            return;
        }
        
        let ratingHtml = '';
        if (rating.length === 0) {
            ratingHtml = '<div class="alert alert-info">Hələlik heç bir reyting yoxdur</div>';
        } else {
            ratingHtml = '<ol class="list-group list-group-numbered">';
            rating.forEach((item, index) => {
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
                ratingHtml += `
                    <li class="list-group-item d-flex justify-content-between align-items-start">
                        <div class="ms-2 me-auto">
                            <div class="fw-bold">${medal} ${item.full_name}</div>
                        </div>
                        <span class="badge bg-primary rounded-pill">
                            ${period === 'monthly' ? item.monthly_score : item.total_score} bal
                        </span>
                    </li>
                `;
            });
            ratingHtml += '</ol>';
        }
        
        document.getElementById(period).innerHTML = ratingHtml;
    } catch (error) {
        console.error('Reyting yükləmə xətası:', error);
        showError('Reyting yüklənərkən xəta baş verdi');
    }
}

// Admin funksiyaları
function showAddQuestion() {
    document.getElementById('adminContentArea').innerHTML = `
        <div class="stats-card">
            <h4><i class="fas fa-plus"></i> Yeni Sual Əlavə Et</h4>
            <p>Admin sual əlavə etmə funksiyası hazırlanma prosesindədir...</p>
        </div>
    `;
}

function showManageQuestions() {
    document.getElementById('adminContentArea').innerHTML = `
        <div class="stats-card">
            <h4><i class="fas fa-edit"></i> Sualı İdarə Et</h4>
            <p>Sual idarəetmə funksiyası hazırlanma prosesindədir...</p>
        </div>
    `;
}

function showScoreSystem() {
    document.getElementById('adminContentArea').innerHTML = `
        <div class="stats-card">
            <h4><i class="fas fa-cog"></i> Bal Sistemini Tənzimlə</h4>
            <p>Bal sistemi konfiqurasiyası hazırlanma prosesindədir...</p>
        </div>
    `;
}

function showAdminRating() {
    document.getElementById('adminContentArea').innerHTML = `
        <div class="stats-card">
            <h4><i class="fas fa-chart-bar"></i> Reyting Cədvəli</h4>
            <p>Admin reyting paneli hazırlanma prosesindədir...</p>
        </div>
    `;
}

// Xəta göstəricisi
function showError(message) {
    document.getElementById('contentArea').innerHTML = `
        <div class="alert alert-danger">
            <h4><i class="fas fa-exclamation-triangle"></i> Xəta</h4>
            <p>${message}</p>
        </div>
    `;
}

// Çıxış
function logout() {
    currentUser = null;
    isAdmin = false;
    
    // Bütün panelləri gizlət
    document.getElementById('studentDashboard').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'none';
    
    // Əsas səhifəni göstər
    document.getElementById('heroSection').style.display = 'block';
    document.getElementById('featuresSection').style.display = 'block';
    
    // Məzmunu təmizlə
    document.getElementById('contentArea').innerHTML = `
        <div class="stats-card text-center">
            <i class="fas fa-home fa-3x text-muted mb-3"></i>
            <h4>Xoş gəlmisiniz!</h4>
            <p class="text-muted">Sol tərəfdən bir seçim edərək başlaya bilərsiniz.</p>
        </div>
    `;
}

// Səhifə yüklənəndə
document.addEventListener('DOMContentLoaded', function() {
    loadTheme();
});

// Enter düyməsi ilə cavab göndər
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        const userAnswer = document.getElementById('userAnswer');
        if (userAnswer && userAnswer === document.activeElement) {
            const questionId = currentQuestions[currentQuestionIndex]?.id;
            if (questionId) {
                const questionType = currentQuestions.length > 0 ? 'graded' : 'daily';
                checkAnswer(questionId, questionType);
            }
        }
    }
});
