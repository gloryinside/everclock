import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-app.js";
import { getDatabase, ref, push, set, get, child } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-database.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCQbMjWo7Z4k639xPtlcX6si05b-OeYnfo",
  authDomain: "everclock-73fa5.firebaseapp.com",
  projectId: "everclock-73fa5",
  storageBucket: "everclock-73fa5.firebasestorage.app",
  messagingSenderId: "408317990450",
  appId: "1:408317990450:web:1cabd15b686cc1451a4e2b",
  databaseURL: "https://everclock-73fa5-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Application data
const appData = {
  employee: {
    name: "김직원",
    department: "개발팀",
    position: "선임연구원",
    employeeId: "EMP001"
  },
  workStatus: {
    status: "근무중",
    checkInTime: "09:00",
    currentWorkHours: "05:30",
    weeklyHours: "32:15",
    weeklyLimit: "52:00"
  },
  healthData: {
    steps: 8542,
    heartRate: 72,
    activeMinutes: 45,
    wellnessScore: 85
  },
  pendingRequests: [
    { type: "연차", date: "2025-06-10", status: "승인대기" },
    { type: "연장근무", date: "2025-06-06", status: "승인완료" }
  ],
  weeklyWork: [
    { day: '월', total: 8, focused: 5.2, inefficient: 0, meeting: 1, other: 0.8 },
    { day: '화', total: 8.5, focused: 5.5, inefficient: 1, meeting: 1.5, other: 0.5 },
    { day: '수', total: 7.75, focused: 4.65, inefficient: 0, meeting: 1, other: 0.6 },
    { day: '목', total: 8.25, focused: 5.35, inefficient: 0, meeting: 1, other: 0.9 },
    { day: '금', total: 5.6, focused: 3.2, inefficient: 1.1, meeting: 0.8, other: 0.5, ongoing: true },
    { day: '토', total: 0, focused: 0, inefficient: 0, meeting: 0, other: 0 },
    { day: '일', total: 0, focused: 0, inefficient: 0, meeting: 0, other: 0 }
  ]
};

// Global state
let currentTab = 'dashboard';
let workStartTime = new Date();
workStartTime.setHours(9, 0, 0, 0);

// Get button and status elements
const checkInBtn = document.getElementById('checkInBtn');
const checkOutBtn = document.getElementById('checkOutBtn');
const workStatusBadge = document.getElementById('workStatusBadge');
const checkInTimeElement = document.getElementById('checkInTime');
const currentWorkTimeElement = document.getElementById('currentWorkTime');
const checkInTimeValue = document.getElementById('checkInTimeValue');
const checkInButtonInline = document.getElementById('checkInButtonInline');
const checkOutTimeValue = document.getElementById('checkOutTimeValue');
const checkOutButtonInline = document.getElementById('checkOutButtonInline');
const breakTimeValue = document.getElementById('breakTime');

// =========================
// 퇴근 체크 모달 관련 (DOMContentLoaded 내에서 이벤트 연결)
// =========================

document.addEventListener('DOMContentLoaded', function () {
  // === 팝업 열기/닫기 공통 함수 ===
  function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.style.display = 'flex';
      setTimeout(() => { modal.classList.add('show'); }, 10); // fade-in 효과
    }
  }
  function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.remove('show');
      setTimeout(() => { modal.style.display = 'none'; }, 180);
    }
  }
  // === 팝업 닫기 버튼 및 오버레이 ESC ===
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', function () {
      const modal = btn.closest('.modal');
      if (modal) closeModal(modal.id);
    });
  });
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('mousedown', function (e) {
      if (e.target === modal) closeModal(modal.id);
    });
  });
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal').forEach(modal => {
        if (modal.style.display === 'flex') closeModal(modal.id);
      });
    }
  });

  // === 하단 탭바(nav-item) 이벤트 위임 ===
  const bottomNav = document.querySelector('.bottom-nav');
  if (bottomNav) {
    bottomNav.addEventListener('click', function(e) {
      const item = e.target.closest('.nav-item');
      if (item && item.dataset.tab) {
        switchTab(item.dataset.tab);
      }
    });
  }

  // === 드로어 내 탭 메뉴(슬라이드 메뉴) 이벤트 위임 ===
  const drawerTabMenu = document.querySelector('.drawer-tab-menu');
  if (drawerTabMenu) {
    drawerTabMenu.addEventListener('click', function(e) {
      const btn = e.target.closest('.drawer-tab-item');
      if (btn && btn.dataset.tab) {
        switchTab(btn.dataset.tab);
        closeDrawer();
      }
    });
  }

  // === 퇴근체크 버튼(메인, 인라인 등) 모두 팝업 열기 연결 ===
  ['checkOutBtn', 'checkOutButtonInline'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', () => openModal('checkOutModal'));
  });

  // === 로고 클릭 시 Dashboard 탭 이동 ===
  const logoBtn = document.getElementById('logoBtn');
  if (logoBtn) {
    logoBtn.addEventListener('click', function() {
      switchTab('dashboard');
    });
  }

  // === fade-in 효과용 CSS 동적 추가 ===
  const style = document.createElement('style');
  style.innerHTML = `.fade-in { animation: fadeInTab 0.22s cubic-bezier(.4,1.6,.6,1) 1; }
  @keyframes fadeInTab { 0% { opacity:0; } 100% { opacity:1; } }
  .modal.show .modal-content { animation: modalPopIn 0.22s cubic-bezier(.4,1.6,.6,1) 1; }`;
  document.head.appendChild(style);

  // === 알림/햄버거 드로어 이벤트 연결 ===
  setupDrawerEvents();

  // === 기타 초기화 ===
  setupTabBar();
  setupChatbotFab();
  updateAttendanceFromFirebase();
  updateCurrentTime();
  updateWorkHours();
  updateWorkStatusUI();
  startRealTimeUpdates();
  showRandomHealthRecommendations();
  updateCalendarEvents();
  updateDashboardCardListeners();
  setupCheckOutModalMap();
});

// === SPA 해시 라우팅 및 LocalStorage 기반 탭 상태/데이터 저장 ===
window.addEventListener('hashchange', handleRoute);
function handleRoute() {
  const tab = location.hash.replace('#', '') || 'dashboard';
  switchTab(tab);
}
window.addEventListener('DOMContentLoaded', handleRoute);

// 탭별 임시 데이터 저장/복원 예시
function saveTabData(tab, data) {
  localStorage.setItem('tabData_' + tab, JSON.stringify(data));
}
function loadTabData(tab) {
  try {
    return JSON.parse(localStorage.getItem('tabData_' + tab) || '{}');
  } catch (e) { return {}; }
}

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
  setupTabBar();
  setupChatbotFab();
  updateAttendanceFromFirebase();
  updateCurrentTime();
  updateWorkHours();
  updateWorkStatusUI();
  startRealTimeUpdates();
  showRandomHealthRecommendations();
  updateCalendarEvents();
  updateDashboardCardListeners();
  renderWeeklyWorkChart();
  updateWeeklySummaryCards();
  setInterval(updateCurrentTime, 1000);
  setInterval(updateWorkHours, 60000);
  setInterval(showRandomHealthRecommendations, 30000);
  setupChartBarListeners();
  setupInitialQuickActions();
  
  // === 연차 데이터 렌더링 ===
  const leaveData = {
    total: 15,
    used: 7,
    remaining: 8,
    insight: "올해 연차 사용률이 팀 평균보다 10% 낮습니다. 번아웃 방지를 위해 남은 연차 사용을 권장합니다."
  };
  if (document.getElementById('totalLeave')) {
    document.getElementById('totalLeave').textContent = leaveData.total + '일';
  }
  if (document.getElementById('usedLeave')) {
    document.getElementById('usedLeave').textContent = leaveData.used + '일';
  }
  if (document.getElementById('remainingLeave')) {
    document.getElementById('remainingLeave').textContent = leaveData.remaining + '일';
  }
  if (document.getElementById('leaveInsight')) {
    document.getElementById('leaveInsight').textContent = leaveData.insight;
  }

  // 챗봇 입력창 Enter키 전송 및 버튼 클릭 이벤트 연결
  const chatInput = document.getElementById('chatInput');
  const sendMessageButton = document.getElementById('sendMessage');
  if (chatInput && sendMessageButton) {
    chatInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessageButton.click();
      }
    });
    sendMessageButton.addEventListener('click', function() {
      sendChatMessage();
      setTimeout(() => chatInput.focus(), 100); // 전송 후 입력창 포커스
    });
  }

  // 급여 요약 카드 클릭 시 모달 열기
  const salaryCard = document.getElementById('salarySummaryCard');
  const salaryModal = document.getElementById('salaryDetailModal');
  const closeSalaryModal = document.getElementById('closeSalaryModal');
  const prevBtn = document.getElementById('prevSalaryMonth');
  const nextBtn = document.getElementById('nextSalaryMonth');
  if (salaryCard && salaryModal) {
    salaryCard.addEventListener('click', function() {
      salaryModal.style.display = 'flex';
      renderSalaryModal(salaryMonthIdx);
    });
  }
  if (closeSalaryModal && salaryModal) {
    closeSalaryModal.addEventListener('click', function() {
      salaryModal.style.display = 'none';
    });
  }
  if (prevBtn) {
    prevBtn.addEventListener('click', function() {
      if (salaryMonthIdx > 0) {
        salaryMonthIdx--;
        renderSalaryModal(salaryMonthIdx);
      }
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', function() {
      if (salaryMonthIdx < salaryData.length-1) {
        salaryMonthIdx++;
        renderSalaryModal(salaryMonthIdx);
      }
    });
  }

  // 근태현황 탭 전환 로직 추가
  const attendanceTabs = document.querySelectorAll('.attendance-tab');
  const mySummary = document.getElementById('attendanceSummaryMy');
  const teamSummary = document.getElementById('attendanceSummaryTeam');
  attendanceTabs.forEach(tab => {
    tab.addEventListener('click', function() {
      attendanceTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const type = tab.getAttribute('data-attendance-tab');
      if (type === 'my') {
        if (mySummary) mySummary.style.display = '';
        if (teamSummary) teamSummary.style.display = 'none';
      } else {
        if (mySummary) mySummary.style.display = 'none';
        if (teamSummary) teamSummary.style.display = '';
      }
    });
  });

  // === 사이드 드로어(슬라이드 메뉴) ===
  const menuButton = document.getElementById('menuButton');
  const sideDrawer = document.getElementById('sideDrawer');
  const drawerOverlay = document.getElementById('drawerOverlay');
  const drawerUserInfo = document.getElementById('drawerUserInfo');
  const drawerUserEmail = document.getElementById('drawerUserEmail');
  const drawerLogoutBtn = document.getElementById('drawerLogoutBtn');

  // 드로어 열기
  function openDrawer() {
    if (sideDrawer) sideDrawer.style.transform = 'translateX(0)';
    if (drawerOverlay) drawerOverlay.style.display = 'block';
    document.body.style.overflow = 'hidden';
  }
  // 드로어 닫기
  function closeDrawer() {
    if (sideDrawer) sideDrawer.style.transform = 'translateX(-100%)';
    if (drawerOverlay) drawerOverlay.style.display = 'none';
    document.body.style.overflow = '';
  }
  if (menuButton) {
    menuButton.addEventListener('click', openDrawer);
  }
  if (drawerOverlay) {
    drawerOverlay.addEventListener('click', closeDrawer);
  }
  // ESC 키로 닫기
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && drawerOverlay && drawerOverlay.style.display === 'block') {
      closeDrawer();
    }
  });
  // 메뉴 클릭 시 탭 이동 및 닫기
  document.querySelectorAll('.drawer-menu-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const tab = btn.getAttribute('data-tab');
      if (typeof switchTab === 'function') switchTab(tab);
      closeDrawer();
    });
  });
  // 로그아웃 버튼
  if (drawerLogoutBtn) {
    drawerLogoutBtn.addEventListener('click', async function() {
      if (window.auth && typeof window.auth.signOut === 'function') {
        await window.auth.signOut();
      } else if (typeof firebase !== 'undefined' && firebase.auth) {
        await firebase.auth().signOut();
      }
      window.location.href = 'login.html';
    });
  }
  // 사용자 정보 동적 출력 (Firebase Auth)
  if (typeof window.auth !== 'undefined') {
    import('https://www.gstatic.com/firebasejs/11.9.0/firebase-auth.js').then(({ getAuth, onAuthStateChanged }) => {
      const auth = getAuth();
      onAuthStateChanged(auth, user => {
        if (user) {
          if (drawerUserInfo) drawerUserInfo.textContent = user.displayName || '사용자';
          if (drawerUserEmail) drawerUserEmail.textContent = user.email || '';
        }
      });
    });
  }

  // 근태신청/신청현황 폼/내역 LocalStorage 연동
  const attendanceRequestForm = document.getElementById('attendanceRequestForm');
  const saveRequestBtn = document.getElementById('saveRequestBtn');
  const submitRequestBtn = document.getElementById('submitRequestBtn');
  const attendanceRequestMsg = document.getElementById('attendanceRequestMsg');
  const attendanceStatusBtn = document.getElementById('attendanceStatusBtn');
  const attendanceStatusModal = document.getElementById('attendanceStatusModal');
  const attendanceStatusList = document.getElementById('attendanceStatusList');

  // 신청 내역 불러오기
  function getAttendanceRequests() {
    try {
      return JSON.parse(localStorage.getItem('attendanceRequests') || '[]');
    } catch (e) { return []; }
  }
  // 신청 내역 저장
  function setAttendanceRequests(list) {
    localStorage.setItem('attendanceRequests', JSON.stringify(list));
  }
  // 폼 값 읽기
  function getFormData() {
    return {
      type: document.getElementById('requestType').value,
      start: document.getElementById('requestStart').value,
      end: document.getElementById('requestEnd').value,
      memo: document.getElementById('requestMemo').value,
      approver: document.getElementById('requestApprover').value
    };
  }
  // 폼 리셋
  function resetForm() {
    attendanceRequestForm.reset();
  }
  // 메시지 출력
  function showRequestMsg(msg) {
    attendanceRequestMsg.textContent = msg;
    attendanceRequestMsg.style.display = 'block';
    setTimeout(() => { attendanceRequestMsg.style.display = 'none'; }, 1500);
  }
  // 저장/상신 처리
  function handleRequestSubmit(status) {
    const data = getFormData();
    if (!data.type || !data.start || !data.end) return;
    const now = new Date();
    const req = {
      ...data,
      status: status,
      created: now.toISOString(),
      id: 'REQ-' + now.getTime()
    };
    const list = getAttendanceRequests();
    list.unshift(req); // 최신순
    setAttendanceRequests(list);
    showRequestMsg('처리되었습니다.');
    resetForm();
    renderAttendanceStatusList();
  }
  // 저장 버튼
  if (saveRequestBtn) {
    saveRequestBtn.addEventListener('click', function(e) {
      e.preventDefault();
      handleRequestSubmit('저장');
    });
  }
  // 상신(폼 submit)
  if (attendanceRequestForm) {
    attendanceRequestForm.addEventListener('submit', function(e) {
      e.preventDefault();
      handleRequestSubmit('상신');
    });
  }
  // 신청내역 렌더링(최근 1달)
  function renderAttendanceStatusList() {
    if (!attendanceStatusList) return;
    const list = getAttendanceRequests();
    const now = new Date();
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setDate(now.getDate() - 30);
    const filtered = list.filter(item => {
      const d = new Date(item.created);
      return d >= oneMonthAgo && d <= now;
    });
    if (filtered.length === 0) {
      attendanceStatusList.innerHTML = '<div style="color:#888; text-align:center;">최근 1달 내 신청 내역이 없습니다.</div>';
      return;
    }
    attendanceStatusList.innerHTML = filtered.map(item => `
      <div style="border-bottom:1px solid #eee; padding:8px 0;">
        <div><b>${item.type}</b> <span style="color:#888; font-size:0.95em;">(${item.status})</span></div>
        <div style="font-size:0.96em; color:#232831;">${item.start} ~ ${item.end}</div>
        <div style="font-size:0.95em; color:#888;">${item.memo ? '사유: ' + item.memo : ''}</div>
        <div style="font-size:0.95em; color:#888;">결재선: ${item.approver || '-'}</div>
        <div style="font-size:0.92em; color:#bbb;">신청일: ${item.created.slice(0,10)}</div>
      </div>
    `).join('');
  }
  // 신청내역 팝업 열릴 때마다 렌더링
  if (attendanceStatusBtn && attendanceStatusModal) {
    attendanceStatusBtn.addEventListener('click', function() {
      renderAttendanceStatusList();
    });
  }
});

function setupTabBar() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const tabName = item.getAttribute('data-tab');
      switchTab(tabName);
        });
    });
}

function switchTab(tabName) {
  // Update navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });
  const activeNav = document.querySelector(`.nav-item[data-tab="${tabName}"]`);
  if (activeNav) activeNav.classList.add('active');

  // Update content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  const activeTab = document.getElementById(tabName);
  if (activeTab) activeTab.classList.add('active');

  // 해시 동기화
  if (location.hash.replace('#','') !== tabName) {
    location.hash = '#' + tabName;
  }

  // 탭별 데이터 복원 예시 (입력값 등)
  const data = loadTabData(tabName);
  if (tabName === 'dashboard' && data.dashboardInput) {
    const input = document.getElementById('dashboardInput');
    if (input) input.value = data.dashboardInput;
  }

  // === 탭 전환 시 스크롤을 맨 위로 이동 ===
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

  // 기존 탭별 데이터 fetch 및 UI 업데이트
  if (tabName === 'dashboard' || tabName === 'attendance') {
    updateAttendanceFromFirebase();
  }
  if (tabName === 'analytics') {
    renderWeeklyWorkChart && renderWeeklyWorkChart();
    animateCharts && animateCharts();
  }
  if (tabName === 'health') {
    updateHealthMetrics && updateHealthMetrics();
  }
  if (tabName === 'recommendations') {
    // 추천 데이터 갱신 등
  }
  if (tabName === 'calendar') {
    // 일정 데이터 갱신 등
  }
}

function updateCurrentTime() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const timeString = `${hours}:${minutes}`;
  // 기존 current-time 갱신은 제거됨
  // 오늘 날짜 갱신
  const dateString = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  const currentDateElement = document.getElementById('current-date');
  if (currentDateElement) {
    currentDateElement.textContent = dateString;
  }
  // '현재 근무 상태' 카드 내 현재시간 갱신
  const workStatusTimeElement = document.getElementById('currentWorkStatusTime');
  if (workStatusTimeElement) {
    workStatusTimeElement.textContent = timeString;
  }
}

function updateWorkHours() {
  const now = new Date();
  const startTime = new Date(workStartTime);
  const diffMs = now - startTime;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  const workTimeString = `${diffHours.toString().padStart(2, '0')}:${diffMinutes.toString().padStart(2, '0')}`;
  const workTimeElement = document.getElementById('currentWorkTime');
  if (workTimeElement) {
    workTimeElement.textContent = workTimeString;
  }

  // Update weekly hours display with remaining/overtime
  const weeklyHoursElement = document.querySelector('.weekly-hours-progress .progress-info span:first-child');
  const [weeklyHours, weeklyMinutes] = appData.workStatus.weeklyHours.split(':').map(Number);
  const [weeklyLimitHours, weeklyLimitMinutes] = appData.workStatus.weeklyLimit.split(':').map(Number);
  const totalWeeklyMinutes = weeklyHours * 60 + weeklyMinutes;
  const totalWeeklyLimitMinutes = weeklyLimitHours * 60 + weeklyLimitMinutes;
  const remainingMinutes = totalWeeklyLimitMinutes - totalWeeklyMinutes;
  
  let weeklyStatusText = `${appData.workStatus.weeklyHours} / ${appData.workStatus.weeklyLimit}`;
  const progressStatusElement = document.querySelector('.progress-status');
  
  if (remainingMinutes >= 0) {
    const remHours = Math.floor(remainingMinutes / 60);
    const remMinutes = remainingMinutes % 60;
    weeklyStatusText += ` (남은 시간: ${remHours}시간 ${remMinutes}분)`;
    progressStatusElement.classList.remove('warning');
    progressStatusElement.classList.add('safe');
    progressStatusElement.querySelector('span').textContent = '✓ 안전한 근무량입니다';
  } else {
    const overtimeMinutes = Math.abs(remainingMinutes);
    const otHours = Math.floor(overtimeMinutes / 60);
    const otMinutes = overtimeMinutes % 60;
    weeklyStatusText += ` (초과 근무: ${otHours}시간 ${otMinutes}분)`;
    progressStatusElement.classList.remove('safe');
    progressStatusElement.classList.add('warning');
    progressStatusElement.querySelector('span').textContent = `⚠️ 주 ${weeklyLimitHours}시간 초과!`;
  }
  
  if (weeklyHoursElement) {
    weeklyHoursElement.textContent = weeklyStatusText;
  }
}

function updateWorkStatusUI() {
  const status = appData.workStatus.status;

  // Update status badge text and class
  if (workStatusBadge) {
    workStatusBadge.textContent = status;
    workStatusBadge.classList.remove('working', 'not-working'); // Add other potential statuses if needed
    if (status === '근무중') {
      workStatusBadge.classList.add('working');
    } else { // Assuming '미근무' or other states are not working
      workStatusBadge.classList.add('not-working'); // Need to add .status-badge.not-working style in CSS
    }
  }

  // Toggle button visibility
  if (checkInBtn && checkOutBtn) {
    if (status === '근무중') {
      checkInBtn.classList.add('hidden');
      checkOutBtn.classList.remove('hidden');
    } else {
      checkInBtn.classList.remove('hidden');
      checkOutBtn.classList.add('hidden');
    }
  }

  // Update check-in time display
  if (checkInTimeElement) {
    checkInTimeElement.textContent = appData.workStatus.checkInTime;
  }
  // Update current work time display (handled by updateWorkHours, just ensure it's cleared if not working)
  if (currentWorkTimeElement && status !== '근무중') {
      currentWorkTimeElement.textContent = '--:--'; // Clear time when not working
  }

  // Show check-in time, hide check-in button
  checkInTimeValue.classList.remove('hidden');
  checkInButtonInline.classList.add('hidden');
  // Show check-out button, hide check-out time value initially
  checkOutButtonInline.classList.remove('hidden');
  checkOutTimeValue.classList.add('hidden'); // Hide time value when button is shown

  // Update displayed times (placeholders for now)
  checkInTimeValue.textContent = appData.workStatus.checkInTime || '--:--';
  checkOutTimeValue.textContent = appData.workStatus.checkOutTime || '--:--';
  breakTimeValue.textContent = appData.workStatus.breakTime || '--:--';
}

// 근태 데이터 fetch 및 UI 반영 함수
async function updateAttendanceFromFirebase() {
  const employeeId = appData.employee.employeeId;
  const dbRef = ref(db);
  let attendanceData = {};
  try {
    // 최근 4주(28일) 데이터 fetch
    const now = new Date();
    const dates = [];
    for (let i = 0; i < 28; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      dates.push(d.toISOString().slice(0, 10));
    }
    // 병렬 fetch
    const results = await Promise.all(
      dates.map(dateKey => get(child(dbRef, `attendance/${employeeId}/${dateKey}`)))
    );
    results.forEach((snap, idx) => {
      if (snap.exists()) {
        attendanceData[dates[idx]] = snap.val();
      }
    });
  } catch (e) {
    console.error('근태 데이터 fetch 실패:', e);
  }

  // 일별 근무시간 계산
  let weeklyData = [];
  let totalMinutes = 0;
  let weekMap = {};
  let todayKey = new Date().toISOString().slice(0, 10);
  let todayCheckIn = null, todayCheckOut = null;

  Object.entries(attendanceData).forEach(([date, record]) => {
    if (record.checkInTime && record.checkOutTime) {
      // 근무시간 계산
      const [inH, inM] = record.checkInTime.split(":").map(Number);
      const [outH, outM] = record.checkOutTime.split(":").map(Number);
      let minutes = (outH * 60 + outM) - (inH * 60 + inM);
      if (minutes < 0) minutes += 24 * 60; // 야간근무 보정
      totalMinutes += minutes;
      // 주차별 집계(월~일)
      const d = new Date(date);
      const week = d.getFullYear() + '-' + (d.getMonth()+1).toString().padStart(2,'0') + '-W' + getWeekNumber(d);
      if (!weekMap[week]) weekMap[week] = 0;
      weekMap[week] += minutes;
      // 오늘 출근/퇴근
      if (date === todayKey) {
        todayCheckIn = record.checkInTime;
        todayCheckOut = record.checkOutTime;
      }
    }
  });

  // UI 반영: 누적 근무시간
  const totalH = Math.floor(totalMinutes / 60);
  const totalM = totalMinutes % 60;
  const totalStr = `${totalH}h ${totalM}m`;
  const totalEl = document.querySelector('.attendance-summary-total-time');
  if (totalEl) totalEl.textContent = totalStr;

  // 오늘 출근/퇴근 시간
  if (checkInTimeElement) checkInTimeElement.textContent = todayCheckIn || '--:--';
  if (checkOutTimeValue) checkOutTimeValue.textContent = todayCheckOut || '--:--';

  // 그래프(주간 근무시간)
  // 최근 4주 데이터
  const weekLabels = Object.keys(weekMap).slice(-4);
  const weekValues = weekLabels.map(w => weekMap[w]);
  const maxWeek = Math.max(...weekValues, 1);
  const chartPlaceholder = document.querySelector('.attendance-summary-chart-placeholder');
  if (chartPlaceholder) {
    chartPlaceholder.innerHTML = '<div style="display:flex;align-items:flex-end;height:38px;gap:6px;width:100%;justify-content:center;">' +
      weekValues.map((v,i) => `<div style="flex:1;min-width:12px;height:${Math.round((v/maxWeek)*36)+2}px;background:#4A90E2;border-radius:6px 6px 0 0;display:flex;align-items:flex-end;justify-content:center;position:relative;">
        <span style="position:absolute;bottom:100%;left:50%;transform:translateX(-50%);font-size:0.85em;color:#fff;white-space:nowrap;">${Math.round(v/60)}h</span>
      </div>`).join('') + '</div>';
  }

  // 안내: 데이터 없을 때
  if (Object.keys(attendanceData).length === 0) {
    if (totalEl) totalEl.textContent = '0h 0m';
    if (chartPlaceholder) chartPlaceholder.innerHTML = '<div class="bar-chart-placeholder">근태 기록이 없습니다</div>';
  }
}

// 주차 계산 함수(ISO week)
function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1)/7);
  return weekNo;
}

// 출근 기록 함수
async function recordCheckInToFirebase(employee, timeStr) {
  const today = new Date();
  const dateKey = today.toISOString().slice(0,10); // YYYY-MM-DD
  const checkInRef = ref(db, `attendance/${employee.employeeId}/${dateKey}`);
  await set(checkInRef, {
    type: 'checkin',
    name: employee.name,
    employeeId: employee.employeeId,
    department: employee.department,
    position: employee.position,
    checkInTime: timeStr,
    checkOutTime: null,
    timestamp: today.toISOString()
  });
}
// 퇴근 기록 함수
async function recordCheckOutToFirebase(employee, timeStr) {
  const today = new Date();
  const dateKey = today.toISOString().slice(0,10); // YYYY-MM-DD
  const checkOutRef = ref(db, `attendance/${employee.employeeId}/${dateKey}`);
  // 기존 출근 데이터에 퇴근 시간만 업데이트
  await set(checkOutRef, {
    type: 'checkout',
    name: employee.name,
    employeeId: employee.employeeId,
    department: employee.department,
    position: employee.position,
    checkInTime: appData.workStatus.checkInTime || null,
    checkOutTime: timeStr,
    timestamp: today.toISOString()
  });
}

// 기존 handleCheckIn/handleCheckOut 수정
async function handleCheckIn() {
  console.log('Check-in button clicked');
  appData.workStatus.status = '근무중';
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  appData.workStatus.checkInTime = timeStr;
  appData.workStatus.checkOutTime = null;
  updateWorkStatusUI();
  // Firebase 기록
  try {
    await recordCheckInToFirebase(appData.employee, timeStr);
    showToast('출근이 기록되었습니다.');
  } catch (e) {
    showToast('출근 기록에 실패했습니다.');
    console.error(e);
  }
}

async function handleCheckOut() {
  console.log('Check-out button clicked');
  appData.workStatus.status = '미근무';
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  appData.workStatus.checkOutTime = timeStr;
  updateWorkStatusUI();
  // Firebase 기록
  try {
    await recordCheckOutToFirebase(appData.employee, timeStr);
    showToast('퇴근이 기록되었습니다.');
  } catch (e) {
    showToast('퇴근 기록에 실패했습니다.');
    console.error(e);
  }
}

// Placeholder function for showing a toast message
// In a real application, this would involve creating and displaying a visible UI element
function showToast(message) {
    console.log('Toast Message:', message); // Log to console for now
    // --- Placeholder for Toast UI ----
    // Example (requires HTML for a toast container):
    // const toastContainer = document.getElementById('toastContainer');
    // if (toastContainer) {
    //     const toast = document.createElement('div');
    //     toast.classList.add('toast');
    //     toast.textContent = message;
    //     toastContainer.appendChild(toast);
    //     setTimeout(() => {
    //         toast.remove();
    //     }, 3000); // Remove after 3 seconds
    // }
    // --- End Placeholder ---
}

function updateAiWorkStatus() {
    const statusElement = document.getElementById('aiWorkStatus');
    if (statusElement) {
        const statuses = ['좋음', '보통', '약간 피곤함', '집중력 저하'];
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
        statusElement.textContent = randomStatus;
        
        // Update class for styling (simulated based on status text)
        statusElement.classList.remove('good', 'normal', 'tired', 'warning');
        if (randomStatus === '좋음') {
            statusElement.classList.add('good');
        } else if (randomStatus === '보통') {
            statusElement.classList.add('normal');
        } else if (randomStatus.includes('피곤함')) {
            statusElement.classList.add('tired');
        } else if (randomStatus.includes('저하')) {
            statusElement.classList.add('warning');
        }
        
        // Optional: Change icon based on status (requires adding icon elements in HTML)
        const statusIcon = statusElement.parentElement.querySelector('.ai-status-icon');
        if(statusIcon) { // Assuming an icon element exists next to the status text
            if (randomStatus === '좋음') statusIcon.textContent = '😊'; // Happy face
            else if (randomStatus === '보통') statusIcon.textContent = '😐'; // Neutral face
            else if (randomStatus.includes('피곤함')) statusIcon.textContent = ''; // Worried face
            else if (randomStatus.includes('저하')) statusIcon.textContent = '😩'; // Tired face
            else statusIcon.textContent = '🤖'; // Default icon
        }
    }
}

function startRealTimeUpdates() {
  // Simulate real-time health data updates
  setInterval(() => {
    updateHealthData();
    updateHealthAdvice(); // Update health advice periodically
  }, 5000);

  // Simulate AI work status updates
  setInterval(() => {
    updateAiWorkStatus();
  }, 10000); // Update every 10 seconds

  // Simulate compliance alerts
  setInterval(() => {
    checkComplianceAlerts();
  }, 15000);
}

function updateHealthData() {
  // Simulate minor changes in health metrics
  const stepIncrease = Math.floor(Math.random() * 10);
  appData.healthData.steps += stepIncrease;
  
  const heartRateChange = Math.floor(Math.random() * 6) - 3; // -3 to +3
  appData.healthData.heartRate = Math.max(60, Math.min(100, appData.healthData.heartRate + heartRateChange));
  
  // Update UI
  const healthItems = document.querySelectorAll('.health-item');
  if (healthItems.length > 0) {
    healthItems[0].querySelector('.health-value').textContent = appData.healthData.steps.toLocaleString();
    healthItems[1].querySelector('.health-value').textContent = appData.healthData.heartRate;
  }
}

function showRandomHealthRecommendations() {
  const recommendations = [
    { icon: '💪', title: '활동 권유', message: '1시간째 앉아계시네요. 5분 스트레칭은 어떠세요?', type: 'health', context: '마지막 활동 감지 시간: 1시간 전' },
    { icon: '💧', title: '수분 섭취', message: '수분 섭취를 잊지 마세요. 물 한 잔은 어떠세요?', type: 'health', context: '마지막 수분 섭취 기록: 2시간 전' },
    { icon: '👀', title: '눈 건강', message: '20-20-20 법칙: 20분마다 20초간 20피트 먼 곳을 바라보세요.', type: 'health', context: '스크린 응시 시간: 2시간 연속' },
    { icon: '🌬️', title: '호흡 운동', message: '깊게 숨을 들이마시고 천천히 내쉬어 보세요.', type: 'health', context: '현재 심박수: 75bpm (안정 시)' },
    { icon: '🚶', title: '움직임 권유', message: '잠시 자리에서 일어나 걸어보시는 건 어떨까요?', type: 'health', context: '총 걸음 수: 1,500 걸음 (목표 미달)' },
    { icon: '✨', title: '집중 시간 추천', message: '오전 10시부터 11시까지 집중도가 높습니다. 중요한 업무를 처리해 보세요.', type: 'productivity', context: '과거 데이터 분석 결과' },
    { icon: '🗓️', title: '퇴근 시간 알림', message: '예상 퇴근 시간까지 2시간 남았습니다. 오늘 업무를 마무리하세요.', type: 'work-life', context: '예상 근무 시간 기반' }
  ];

  const randomRec = recommendations[Math.floor(Math.random() * recommendations.length)];
  
  // Update the second recommendation in the AI recommendations card
  const recItems = document.querySelectorAll('.recommendation-item');
  if (recItems.length > 1) {
    const secondRec = recItems[1];
    secondRec.querySelector('.recommendation-icon').textContent = randomRec.icon;
    secondRec.querySelector('h4').textContent = randomRec.title;
    secondRec.querySelector('p').textContent = randomRec.message;
    
    // Add context if available
    let contextElement = secondRec.querySelector('.recommendation-context');
    if (!contextElement) {
      contextElement = document.createElement('p');
      contextElement.classList.add('recommendation-context');
      secondRec.querySelector('.recommendation-content').appendChild(contextElement);
    }
    contextElement.textContent = randomRec.context || '';

    // Add a more prominent animation
    secondRec.classList.remove('fade-in'); // Remove class to reset animation
    void secondRec.offsetWidth; // Trigger reflow
    secondRec.classList.add('fade-in'); // Add class to restart animation
  }
}

function animateCharts() {
  const bars = document.querySelectorAll('.bar');
  bars.forEach((bar, index) => {
    bar.style.height = '0%';
    setTimeout(() => {
      const heights = ['80%', '95%', '75%', '82%', '70%'];
      bar.style.height = heights[index] || '50%';
    }, index * 100);
  });
}

function updateHealthMetrics() {
  // Animate progress bars in health tab
  const progressBars = document.querySelectorAll('.metric-progress .progress-fill');
  progressBars.forEach(bar => {
    const width = bar.style.width;
    bar.style.width = '0%';
    setTimeout(() => {
      bar.style.width = width;
    }, 200);
  });
}

function updateMenuRecommendations() {
  const now = new Date();
  const hour = now.getHours();
  
  let timeBasedMessage = '';
  if (hour >= 11 && hour <= 14) {
    timeBasedMessage = '점심시간이네요! 오늘의 추천 메뉴를 확인해보세요.';
  } else if (hour >= 15 && hour <= 17) {
    timeBasedMessage = '오후 간식 시간! 가벼운 음료는 어떠세요?';
  } else {
    timeBasedMessage = '식사 시간에 맞춰 추천을 준비해드릴게요.';
  }
  
  // Add time-based recommendation if in recommendations tab
  if (currentTab === 'recommendations') {
    addBotMessage(timeBasedMessage);
  }
}

function checkComplianceAlerts() {
  const alerts = [
    { type: 'warning', message: '오늘 근무시간이 8시간에 가까워지고 있습니다.', time: '방금' },
    { type: 'info', message: '다음 주 연차 사용을 권장합니다.', time: '어제' },
    { type: 'warning', message: '이번 주 연장근무 시간이 12시간을 초과했습니다.', time: '2시간 전' },
    // Add more simulated alerts here
  ];
  
  // For demonstration, let's just update the existing alerts with more detail
  const alertItems = document.querySelectorAll('.alert-item');
  if (alertItems.length >= alerts.length) {
    alerts.forEach((alert, index) => {
      const alertElement = alertItems[index];
      alertElement.classList.remove('warning', 'info');
      alertElement.classList.add(alert.type);
      alertElement.querySelector('h4').textContent = alert.type === 'warning' ? '주의' : '정보';
      alertElement.querySelector('p').textContent = alert.message;
      // Add time or detail element if it doesn't exist
      let timeElement = alertElement.querySelector('.alert-time');
      if (!timeElement) {
        timeElement = document.createElement('span');
        timeElement.classList.add('alert-time');
        alertElement.querySelector('.alert-content').prepend(timeElement);
      }
      timeElement.textContent = alert.time;
    });
  }
}

function sendChatMessage() {
  const chatInput = document.getElementById('chatInput');
  const sendMessageButton = document.getElementById('sendMessage');
  const message = chatInput.value.trim();
  
  if (message) {
    addUserMessage(message);
    chatInput.value = '';
    if (sendMessageButton) {
      sendMessageButton.disabled = true;
      sendMessageButton.textContent = '전송중...';
      sendMessageButton.classList.add('loading');
    }
    setTimeout(() => {
      processUserMessage(message);
      if (sendMessageButton) {
        sendMessageButton.disabled = false;
        sendMessageButton.textContent = '전송';
        sendMessageButton.classList.remove('loading');
      }
    }, 1000);
  }
}

function addUserMessage(message) {
  const chatMessages = document.getElementById('chatMessages');
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message user';
  messageDiv.innerHTML = `<div class="message-content">${message}</div>`;
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addBotMessage(message) {
  const chatMessages = document.getElementById('chatMessages');
  const messageElement = document.createElement('div');
  messageElement.classList.add('message', 'bot');
  
  // Handle different message types (text, card, buttons, thinking)
  if (message.type === 'text') {
    messageElement.innerHTML = `<div class="message-content">${message.text}</div>`;
  } else if (message.type === 'card') {
    messageElement.innerHTML = `
        <div class="message-content card-message">
            <h4>${message.title}</h4>
            <p>${message.description}</p>
            ${message.button ? `<button class="card-button">${message.button.text}</button>` : ''}
        </div>
    `;
    // Add event listener for the button if it exists
    setTimeout(() => { // Need a slight delay to ensure button exists in DOM
      const cardButton = messageElement.querySelector('.card-button');
      if (cardButton && message.button && message.button.action) {
        cardButton.addEventListener('click', () => handleQuickAction(message.button.action));
      }
    }, 0);
  } else if (message.type === 'thinking') {
    messageElement.innerHTML = `<div class="message-content thinking">...</div>`;
  } else if (message.type === 'buttons') {
    let buttonsHtml = '';
    message.buttons.forEach(button => {
      buttonsHtml += `<button class="quick-btn" data-action="${button.action}">${button.text}</button>`;
    });
    messageElement.innerHTML = `<div class="message-content quick-actions">${buttonsHtml}</div>`;
     // Re-attach event listeners for new quick action buttons
    setTimeout(() => { // Need a slight delay to ensure buttons exist in DOM
      messageElement.querySelectorAll('.quick-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const action = btn.getAttribute('data-action');
          handleQuickAction(action);
        });
      });
    }, 0);
  }

  chatMessages.appendChild(messageElement);
  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function handleQuickAction(action) {
  addUserMessage(`${action} 신청`); // Show user message for quick action
  simulateApprovalRequest(action); // Simulate the request
}

function processUserMessage(message) {
  const lowerMessage = message.toLowerCase();
  let botResponse = { type: 'text', text: '죄송합니다. 이해하지 못했습니다. 다른 질문이 있으신가요?' };
  
  // Simulate bot thinking
  const thinkingMessageId = 'thinking-' + Date.now();
  addBotMessage({ type: 'thinking', id: thinkingMessageId }); // Add thinking message
  
  // Simulate processing time
  setTimeout(() => {
    // Remove thinking message
    const thinkingElement = document.querySelector('.message.bot .thinking');
    if (thinkingElement && thinkingElement.parentElement) {
      // Find the message div containing the thinking element and remove it
      let currentElement = thinkingElement.parentElement;
      while(currentElement && !currentElement.classList.contains('message')) {
        currentElement = currentElement.parentElement;
      }
      if (currentElement) {
        currentElement.remove();
      }
    }

    if (lowerMessage.includes('안녕') || lowerMessage.includes('안녕하세요')) {
      botResponse = { type: 'text', text: '안녕하세요! 무엇을 도와드릴까요?' };
    } else if (lowerMessage.includes('근무 시간') || lowerMessage.includes('일한 시간')) {
      botResponse = { type: 'text', text: `김직원님의 현재 근무 시간은 ${appData.workStatus.currentWorkHours} 입니다. 주간 총 ${appData.workStatus.weeklyHours} 근무하셨습니다.` };
    } else if (lowerMessage.includes('연차')) {
      botResponse = { type: 'text', text: '연차 신청하시겠어요? 날짜와 함께 말씀해주세요.' };
    } else if (lowerMessage.includes('점심') || lowerMessage.includes('메뉴 추천')) {
      botResponse = { type: 'card', title: '점심 메뉴 추천', description: '비오는 날이네요! 따뜻한 김치찌개는 어떠세요?', button: { text: '더 보기', action: '점심 추천 상세' } };
    } else if (lowerMessage.includes('faq') || lowerMessage.includes('자주 묻는 질문')) {
      // Instead of sending buttons, show the FAQ list
      showFaqList(); // Show the FAQ list
      return; // Exit the function after showing FAQ list
    }
    
    addBotMessage(botResponse);
  }, 1500); // Simulate processing delay
}

function simulateFormCreation(type) {
  addBotMessage(`${type} 신청서를 자동으로 작성했습니다. 관리자에게 승인 요청을 보내고 있어요...`);
}

function simulateApprovalRequest(type) {
  addBotMessage('📤 관리자에게 알림을 전송했습니다.');
  
  setTimeout(() => {
    addBotMessage('✅ 관리자가 확인 중입니다. 승인 결과는 곧 알려드릴게요.');
    
    // Simulate approval notification
    setTimeout(() => {
      const isApproved = Math.random() > 0.3; // 70% approval rate
      if (isApproved) {
        addBotMessage(`🎉 ${type} 신청이 승인되었습니다!`);
        showNotification(`${type} 신청이 승인되었습니다.`, 'success');
      } else {
        addBotMessage(`⚠️ ${type} 신청이 반려되었습니다. 관리자와 상의해주세요.`);
        showNotification(`${type} 신청이 반려되었습니다.`, 'warning');
      }
    }, 3000);
  }, 2000);
}

function setupInteractiveElements() {
  // Add click handlers for health items
  const healthItems = document.querySelectorAll('.health-item');
  healthItems.forEach((item, index) => {
    item.addEventListener('click', () => {
      item.style.transform = 'scale(0.95)';
      setTimeout(() => {
        item.style.transform = 'scale(1)';
      }, 150);
      
      // Show detailed info
      const healthDetails = [
        '목표 달성률: 85% - 조금만 더 걸으면 목표 달성이에요!',
        '심박수가 정상 범위입니다. 건강한 상태를 유지하고 계세요.',
        '오늘 45분간 활동했습니다. 훌륭해요!',
        '전체적인 웰빙 상태가 우수합니다. 계속 유지하세요!'
      ];
      
      showNotification(healthDetails[index], 'info');
    });
  });

  // Add click handlers for recommendation items
  const recItems = document.querySelectorAll('.recommendation-item');
  recItems.forEach(item => {
    item.addEventListener('click', () => {
      const title = item.querySelector('h4').textContent;
      if (title.includes('점심')) {
        switchTab('recommendations');
      } else if (title.includes('활동') || title.includes('스트레칭')) {
        switchTab('health');
      }
    });
  });

  // Add click handlers for menu items
  const menuItems = document.querySelectorAll('.menu-item');
  menuItems.forEach(item => {
    item.addEventListener('click', () => {
      const menuName = item.querySelector('h4').textContent;
      item.style.transform = 'scale(0.98)';
      setTimeout(() => {
        item.style.transform = 'scale(1)';
      }, 150);
      
      showNotification(`${menuName} 선택하셨습니다. 맛있게 드세요!`, 'success');
    });
  });

  // Add click handlers for event items
  const eventItems = document.querySelectorAll('.event-item');
  eventItems.forEach(item => {
    item.addEventListener('click', () => {
      const eventTitle = item.querySelector('h4').textContent;
      const eventTime = item.querySelector('.event-time').textContent;
      
      item.style.transform = 'scale(0.98)';
      setTimeout(() => {
        item.style.transform = 'scale(1)';
      }, 150);
      
      showNotification(`${eventTitle} - ${eventTime}에 예정된 일정입니다.`, 'info');
    });
  });
}

function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.style.cssText = `
    position: fixed;
    top: calc(var(--app-header-height) + 20px);
    left: 20px;
    right: 20px;
    padding: 16px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-base);
    box-shadow: var(--shadow-lg);
    z-index: 400;
    transform: translateY(-100px);
    opacity: 0;
    transition: all 0.3s ease;
    font-size: var(--font-size-sm);
  `;
  
  // Set type-specific styles
  if (type === 'success') {
    notification.style.borderLeftColor = 'var(--app-secondary)';
    notification.style.borderLeftWidth = '4px';
  } else if (type === 'warning') {
    notification.style.borderLeftColor = 'var(--app-warning)';
    notification.style.borderLeftWidth = '4px';
  } else if (type === 'info') {
    notification.style.borderLeftColor = 'var(--app-primary)';
    notification.style.borderLeftWidth = '4px';
  }
  
  notification.textContent = message;
  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.style.transform = 'translateY(0)';
    notification.style.opacity = '1';
  }, 10);
  
  // Auto remove after 4 seconds
  setTimeout(() => {
    notification.style.transform = 'translateY(-100px)';
    notification.style.opacity = '0';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 4000);
  
  // Click to dismiss
  notification.addEventListener('click', () => {
    notification.style.transform = 'translateY(-100px)';
    notification.style.opacity = '0';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  });
}

// Simulate periodic AI insights
setInterval(() => {
  const insights = [
    '이번 주 근무 패턴이 양호합니다. 계속 유지하세요!',
    '내일은 금요일이에요. 한 주 마무리 화이팅!',
    '오늘 활동량이 평소보다 높아요. 좋은 습관이에요!',
    '점심시간이 다가오고 있어요. 건강한 식사 하세요!',
    '수분 섭취를 잊지 마세요. 건강이 최우선입니다.'
  ];
  
  if (Math.random() < 0.1) { // 10% chance every interval
    const randomInsight = insights[Math.floor(Math.random() * insights.length)];
    showNotification(randomInsight, 'info');
  }
}, 20000); // Every 20 seconds

// Initialize service worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registered: ', registration);
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

function updateCalendarEvents() {
    const events = [
        { time: '오늘 20:00', title: '헬스장', detail: '개인 운동 세션', type: 'private' },
        { time: '내일 18:00', title: '팀 회식', detail: '강남역 맛집', type: 'work' },
        { time: '6월 12일 19:00', title: '부모님 생신', detail: '가족 외식', type: 'family' }
        // Add more simulated events here
    ];

    const eventItems = document.querySelectorAll('.calendar-events .event-item');
    if (eventItems.length >= events.length) {
        events.forEach((event, index) => {
            const eventElement = eventItems[index];
            eventElement.querySelector('.event-time').textContent = event.time;
            eventElement.querySelector('h4').textContent = event.title;
            eventElement.querySelector('p').textContent = event.detail; // Use detail for the second line
            // Optionally add a class based on event type for styling
            eventElement.classList.remove('today'); // Remove existing status classes
            if (index === 0) { // Assuming the first event is today for demonstration
                eventElement.classList.add('today');
            }
        });
    }
}

function updateHealthAdvice() {
    const advices = [
        { time: '1시간 전', message: `💪 스트레칭 시간입니다! 목과 어깨를 풀어주세요. (AI 분석: ${appData.workStatus.currentWorkHours} 연속 근무 중)` },
        { time: '30분 전', message: `💧 수분 섭취를 잊지 마세요. 물 한 잔은 어떠세요? (AI 분석: 마지막 수분 섭취 기록 ${Math.floor(Math.random() * 60) + 30}분 전)` },
        { time: '10분 전', message: `👀 눈 건강을 위해 잠시 휴식하세요. (AI 분석: 스크린 응시 시간 ${Math.floor(Math.random() * 3) + 1}시간 연속)` },
        { time: '방금', message: `잠시 일어나 걸어보세요. (AI 분석: ${appData.healthData.steps} 걸음, 목표 ${appData.healthData.steps + 1500} 걸음 남음)` }
        // Add more simulated advices here
    ];

    // For demonstration, let's just update the existing advices with more detail
    const adviceItems = document.querySelectorAll('.health-advice .advice-item');
    if (adviceItems.length > 0) {
        const randomAdvice = advices[Math.floor(Math.random() * advices.length)];
        const adviceElement = adviceItems[0]; // Update the first one for simplicity
        adviceElement.querySelector('.advice-time').textContent = randomAdvice.time;
        adviceElement.querySelector('p').textContent = randomAdvice.message;
         // Add a subtle animation similar to recommendations if desired
         adviceElement.classList.remove('fade-in'); // Need CSS for this
         void adviceElement.offsetWidth; // Trigger reflow
         adviceElement.classList.add('fade-in'); // Need CSS for this
    }
}

const faqData = [
    { question: '연차 신청 방법은 어떻게 되나요?', answer: '챗봇에게 연차 신청이라고 말씀하시거나 빠른 실행 버튼을 이용해주세요.' },
    { question: '연장 근무 규정을 알려주세요.', answer: '주 12시간 이상 연장 근무는 사전에 승인받아야 합니다. 자세한 내용은 인사팀에 문의하세요.' },
    { question: '주간 근무 시간을 확인하고 싶습니다.', answer: '대시보드에서 현재 주간 근무 시간을 확인하실 수 있습니다. 챗봇에게 근무 시간 확인이라고 물어보셔도 됩니다.' }
    // Add more FAQ items here
];

function populateFaqList() {
    const faqListElement = document.getElementById('faqList');
    const faqListUl = faqListElement.querySelector('ul');
    if (faqListUl) {
        faqListUl.innerHTML = ''; // Clear existing list
        faqData.forEach(faq => {
            const listItem = document.createElement('li');
            const button = document.createElement('button');
            button.textContent = faq.question;
            button.addEventListener('click', () => {
                // Simulate user asking the FAQ question and bot responding with the answer
                addUserMessage(faq.question);
                // Simulate thinking time before answering FAQ
                 const thinkingMessageId = 'thinking-' + Date.now();
                 addBotMessage({ type: 'thinking', id: thinkingMessageId });
                  setTimeout(() => {
                     // Remove thinking message
                     const thinkingElement = document.querySelector('.message.bot .thinking');
                      if (thinkingElement && thinkingElement.parentElement) {
                         let currentElement = thinkingElement.parentElement;
                         while(currentElement && !currentElement.classList.contains('message')) {
                             currentElement = currentElement.parentElement;
                         }
                         if (currentElement) {
                             currentElement.remove();
                         }
                     }
                    addBotMessage({ type: 'text', text: faq.answer });
                 }, 500); // Shorter delay for FAQs
                 // Hide FAQ list after selecting one
                 hideFaqList();
            });
            listItem.appendChild(button);
            faqListUl.appendChild(listItem);
        });
    }
}

function showFaqList() {
    const faqListElement = document.getElementById('faqList');
    const chatMessagesElement = document.getElementById('chatMessages');
    if (faqListElement && chatMessagesElement) {
        chatMessagesElement.style.display = 'none';
        faqListElement.style.display = 'block';
        populateFaqList(); // Populate the list every time it's shown (for dynamic data if any)
    }
}

function hideFaqList() {
     const faqListElement = document.getElementById('faqList');
    const chatMessagesElement = document.getElementById('chatMessages');
    if (faqListElement && chatMessagesElement) {
        faqListElement.style.display = 'none';
        chatMessagesElement.style.display = 'block';
    }
}

function updateDashboardCardListeners() {
    const dashboardCards = document.querySelectorAll('#dashboard .card');
    dashboardCards.forEach(card => {
        const targetTab = card.getAttribute('data-target-tab');
        if (targetTab) {
            card.style.cursor = 'pointer'; // Indicate clickable
            card.addEventListener('click', () => {
                switchTab(targetTab);
            });
        }
    });
}

// New function to setup listeners for chart bars
function setupChartBarListeners() {
    const chartBars = document.querySelectorAll('.weekly-chart .chart-bar');
    const complianceDetail = document.querySelector('.compliance-detail-placeholder');

    chartBars.forEach(bar => {
        bar.addEventListener('click', () => {
            // Simulate showing details for the clicked day
            console.log('Chart bar clicked:', bar.querySelector('.tooltip').textContent);
            
            // Show the compliance detail placeholder
            if (complianceDetail) {
                complianceDetail.style.display = 'block';
                // In a real app, you would populate this with data for the clicked day
                complianceDetail.querySelector('h4').textContent = '일별 분석 상세 (' + bar.querySelector('.chart-labels-bottom span:first-child').textContent + ')';
                 complianceDetail.querySelector('p').textContent = '해당 날짜의 상세 근무 및 AI 분석 정보를 여기에 표시합니다.'; // Placeholder content
            }
        });
    });

    // Optional: Hide detail when clicking elsewhere or add a close button
    // For now, it stays visible once shown.
}

// 2. 주간 근무 분석 차트 렌더링 함수
function renderWeeklyWorkChart() {
  const chartBars = document.querySelector('.weekly-chart .chart-bars');
  const chartLabels = document.querySelector('.weekly-chart .chart-labels-bottom');
  if (!chartBars || !chartLabels) return;
  chartBars.innerHTML = '';
  chartLabels.innerHTML = '';
  appData.weeklyWork.forEach((d, i) => {
    // 바 높이 계산 (최대 9시간 기준)
    const maxHours = 9;
    const barHeight = d.total > 0 ? Math.min(100, (d.total / maxHours) * 100) : 0;
    // 각 레이어 비율
    const focusedH = d.focused / d.total * 100 || 0;
    const inefficientH = d.inefficient / d.total * 100 || 0;
    const meetingH = d.meeting / d.total * 100 || 0;
    const otherH = d.other / d.total * 100 || 0;
    // 바/레이어 생성
    const bar = document.createElement('div');
    bar.className = 'chart-bar' + (d.ongoing ? ' current' : '');
    bar.innerHTML = `
      <div class="bar${d.ongoing ? ' active' : ''}" style="height: ${barHeight}%"></div>
      <span class="tooltip">${d.day}: ${d.total > 0 ? d.total.toFixed(2) : '--:--'}h</span>
      <div class="daily-target-line"></div>
      <span class="daily-target-text">8h</span>
      <div class="analysis-layers">
        <div class="analysis-layer focused" style="height: ${focusedH}%"></div>
        <div class="analysis-layer inefficient" style="height: ${inefficientH}%"></div>
        <div class="analysis-layer meeting" style="height: ${meetingH}%"></div>
        <div class="analysis-layer other" style="height: ${otherH}%"></div>
      </div>
    `;
    // 마우스 오버 시 상세 툴큅
    bar.addEventListener('mouseenter', () => {
      bar.querySelector('.tooltip').style.visibility = 'visible';
      bar.querySelector('.tooltip').style.opacity = 1;
    });
    bar.addEventListener('mouseleave', () => {
      bar.querySelector('.tooltip').style.visibility = 'hidden';
      bar.querySelector('.tooltip').style.opacity = 0;
    });
    // 클릭 시 상세 분석(모달 대신 alert)
    bar.addEventListener('click', () => {
      alert(`[${d.day}요일 상세 분석]\n총 근무: ${d.total}h\n집중: ${d.focused}h\n비효율: ${d.inefficient}h\n미팅: ${d.meeting}h\n기타: ${d.other}h`);
    });
    chartBars.appendChild(bar);
    // 하단 라벨
    const label = document.createElement('div');
    label.className = 'chart-label-item';
    label.innerHTML = `<span>${d.day}</span><span class="hours">${d.total > 0 ? d.total.toFixed(2) : '--:--'}</span>`;
    chartLabels.appendChild(label);
  });
  // 주간 요약
  const total = appData.weeklyWork.reduce((sum, d) => sum + d.total, 0);
  const totalElem = document.getElementById('weeklyTotalHours');
  if (totalElem) totalElem.textContent = total.toFixed(2) + 'h';
}

function updateWeeklySummaryCards() {
  // 근무목표 달성률
  const goalElem = document.getElementById('summaryGoalValue');
  if (goalElem) goalElem.textContent = '62%'; // 예시값, 실제 계산 로직 필요

  // 연차잔여
  const leaveElem = document.getElementById('summaryLeaveValue');
  if (leaveElem) leaveElem.textContent = '12/15'; // 예시값, 실제 데이터 연동 필요

  // 출근일수 (이번주 출근일/총 근무일)
  const attendanceElem = document.getElementById('summaryAttendanceValue');
  if (attendanceElem) attendanceElem.textContent = '4/5'; // 예시값, 실제 데이터 연동 필요

  // 초과근무 (이번주 초과근무 시간)
  const overtimeElem = document.getElementById('summaryOvertimeValue');
  if (overtimeElem) overtimeElem.textContent = '3h'; // 예시값, 실제 데이터 연동 필요

  // 누적근무 (이번주 누적 근무/목표)
  const totalElem = document.getElementById('summaryTotalValue');
  if (totalElem) totalElem.textContent = '38/52h'; // 예시값, 실제 데이터 연동 필요
}

// 연차 상세 모달 열기/닫기
function openLeaveModal() {
  document.getElementById('leaveModal').style.display = 'flex';
}
function closeLeaveModal() {
  document.getElementById('leaveModal').style.display = 'none';
}
// AI 인사이트 상세 모달 열기/닫기
function openInsightModal() {
  document.getElementById('insightModal').style.display = 'flex';
}
function closeInsightModal() {
  document.getElementById('insightModal').style.display = 'none';
}

function closeAiInsightCard(event) {
  event.stopPropagation();
  var card = document.getElementById('aiInsightCard');
  if (card) card.style.display = 'none';
}

function openChatbotWithFAQ() {
  var chatbotOverlay = document.getElementById('chatbotOverlay');
  if (chatbotOverlay) {
    chatbotOverlay.classList.add('active');
    if (typeof showFaqList === 'function') showFaqList();
  }
}

// === 인증 방식 선택 모달 관련 ===
function openAttendanceAuthModal(type) {
  const modal = document.getElementById('attendanceAuthModal');
  if (!modal) return;
  modal.style.display = 'flex';
  modal.setAttribute('data-type', type); // 'checkin' or 'checkout'
  document.getElementById('authStatusMsg').textContent = '';
}
function closeAttendanceAuthModal() {
  const modal = document.getElementById('attendanceAuthModal');
  if (!modal) return;
  modal.style.display = 'none';
}

// 인증 방식별 시뮬레이션 함수
function simulateGeoAuth() {
  const msg = document.getElementById('authStatusMsg');
  msg.textContent = '위치 정보 확인 중...';
  setTimeout(() => {
    // 위치 권한 거부/성공 랜덤 시뮬레이션
    if (Math.random() < 0.1) {
      msg.textContent = '위치 권한이 거부되었습니다. 설정에서 권한을 허용해주세요.';
    } else {
      msg.textContent = '위치 인증 성공!';
      setTimeout(() => {
        closeAttendanceAuthModal();
        if (document.getElementById('attendanceAuthModal').getAttribute('data-type') === 'checkin') handleCheckIn();
        else handleCheckOut();
      }, 800);
    }
  }, 1200);
}
function simulateFaceAuth() {
  const msg = document.getElementById('authStatusMsg');
  msg.textContent = '얼굴 인식 중...';
  setTimeout(() => {
    if (Math.random() < 0.1) {
      msg.textContent = '카메라 권한이 거부되었습니다. 설정에서 권한을 허용해주세요.';
    } else {
      msg.textContent = '얼굴 인증 성공!';
      setTimeout(() => {
        closeAttendanceAuthModal();
        if (document.getElementById('attendanceAuthModal').getAttribute('data-type') === 'checkin') handleCheckIn();
        else handleCheckOut();
      }, 800);
    }
  }, 1200);
}
function simulateNfcAuth() {
  const msg = document.getElementById('authStatusMsg');
  msg.textContent = 'NFC 태그 인식 중...';
  setTimeout(() => {
    if (Math.random() < 0.2) {
      msg.textContent = 'NFC 미지원 기기이거나 인식에 실패했습니다.';
    } else {
      msg.textContent = 'NFC 인증 성공!';
      setTimeout(() => {
        closeAttendanceAuthModal();
        if (document.getElementById('attendanceAuthModal').getAttribute('data-type') === 'checkin') handleCheckIn();
        else handleCheckOut();
      }, 800);
    }
  }, 1200);
}

// === 챗봇(어시스턴트) FAB 및 오버레이 동작 ===
function setupChatbotFab() {
  const chatbotFab = document.getElementById('chatbotFab');
  const chatbotOverlay = document.getElementById('chatbotOverlay');
  const closeChatbot = document.getElementById('closeChatbot');
  if (chatbotFab && chatbotOverlay) {
    chatbotFab.addEventListener('click', () => {
      chatbotOverlay.classList.add('active');
      chatbotOverlay.style.display = 'flex';
    });
  }
  if (closeChatbot && chatbotOverlay) {
    closeChatbot.addEventListener('click', () => {
      chatbotOverlay.classList.remove('active');
      chatbotOverlay.style.display = 'none';
    });
  }
  if (chatbotOverlay) {
    chatbotOverlay.addEventListener('click', (e) => {
      if (e.target === chatbotOverlay) {
        chatbotOverlay.classList.remove('active');
        chatbotOverlay.style.display = 'none';
      }
    });
  }
}

function setupInitialQuickActions() {
  document.querySelectorAll('.chatbot-overlay .quick-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      if (btn.disabled) return; // 중복 방지
      btn.disabled = true;
      btn.classList.add('loading');
      const action = btn.getAttribute('data-action');
      handleQuickAction(action);
      setTimeout(() => {
        btn.disabled = false;
        btn.classList.remove('loading');
      }, 2000); // 2초 후 재활성화
    });
  });
}

// 입력값 등 변경 시 LocalStorage에 저장 예시
// (실제 입력 필드에 맞게 적용)
document.addEventListener('input', function(e) {
  if (e.target && e.target.id === 'dashboardInput') {
    saveTabData('dashboard', { dashboardInput: e.target.value });
  }
});

// === 급여정보 모달 및 AI 추세 그래프 ===
const salaryData = [
  { month: '2024년 1월', amount: 3100000, details: { base: 2500000, meal: 200000, transport: 150000, bonus: 100000, etc: 100000, deduction: 100000 }, summary: '연초 성과수당 반영' },
  { month: '2024년 2월', amount: 3150000, details: { base: 2500000, meal: 200000, transport: 150000, bonus: 150000, etc: 100000, deduction: 100000 }, summary: '성과수당 증가' },
  { month: '2024년 3월', amount: 3200000, details: { base: 2500000, meal: 200000, transport: 150000, bonus: 200000, etc: 100000, deduction: 100000 }, summary: '성과수당 증가' },
  { month: '2024년 4월', amount: 3250000, details: { base: 2500000, meal: 200000, transport: 150000, bonus: 200000, etc: 150000, deduction: 150000 }, summary: '기타수당 증가' },
  { month: '2024년 5월', amount: 3180000, details: { base: 2500000, meal: 200000, transport: 150000, bonus: 100000, etc: 180000, deduction: 130000 }, summary: '성과수당 감소' },
  { month: '2024년 6월', amount: 3250000, details: { base: 2500000, meal: 200000, transport: 150000, bonus: 200000, etc: 200000, deduction: 150000 }, summary: '성과수당/기타수당 증가' }
];
let salaryMonthIdx = Number(localStorage.getItem('salaryMonthIdx')) || (salaryData.length - 1);

function renderSalaryModal(idx) {
  const data = salaryData[idx];
  if (!data) return;
  document.getElementById('salaryMonthLabel').textContent = data.month;
  document.getElementById('salaryDetailAmount').textContent = data.amount.toLocaleString() + '원';
  // 상세 내역
  const ul = document.querySelector('#salaryDetailModal ul');
  if (ul) {
    ul.innerHTML = `
      <li>기본급: ${data.details.base.toLocaleString()}원</li>
      <li>식대: ${data.details.meal.toLocaleString()}원</li>
      <li>교통비: ${data.details.transport.toLocaleString()}원</li>
      <li>성과수당: ${data.details.bonus.toLocaleString()}원</li>
      <li>기타: ${data.details.etc.toLocaleString()}원</li>
      <li style=\"color:#e74c3c;\">공제: -${data.details.deduction.toLocaleString()}원 (4대보험 등)</li>
    `;
  }
  // AI 급여 추세 그래프 개선
  const chart = document.getElementById('salaryTrendChart');
  if (chart) {
    chart.innerHTML = '';
    const max = Math.max(...salaryData.map(d=>d.amount));
    salaryData.forEach((d, i) => {
      // 바 wrapper
      const barWrap = document.createElement('div');
      barWrap.style.display = 'flex';
      barWrap.style.flexDirection = 'column';
      barWrap.style.alignItems = 'center';
      barWrap.style.width = '38px';
      barWrap.style.position = 'relative';
      // 바 위 숫자
      const value = document.createElement('div');
      value.style.fontSize = '0.92em';
      value.style.fontWeight = i === idx ? 'bold' : 'normal';
      value.style.color = i === idx ? '#4A90E2' : '#888';
      value.style.marginBottom = '2px';
      value.style.whiteSpace = 'nowrap';
      value.textContent = i === idx ? d.amount.toLocaleString()+'원' : '';
      barWrap.appendChild(value);
      // 바
      const bar = document.createElement('div');
      bar.style.height = (d.amount / max * 25 + 8) + 'px'; // 최대 33px
      bar.style.width = '18px';
      bar.style.background = i === idx ? '#4A90E2' : '#b0c7e6';
      bar.style.borderRadius = '6px 6px 0 0';
      bar.style.display = 'flex';
      bar.style.alignItems = 'flex-end';
      bar.style.justifyContent = 'center';
      bar.style.position = 'relative';
      bar.style.transition = 'background 0.2s';
      bar.title = d.month + ' ' + d.amount.toLocaleString() + '원';
      barWrap.appendChild(bar);
      // 바 아래 월 라벨
      const label = document.createElement('div');
      label.style.fontSize = '0.88em';
      label.style.color = '#888';
      label.style.marginTop = '2px';
      label.style.textAlign = 'center';
      label.style.lineHeight = '1.1';
      label.textContent = d.month.replace('2024년 ','');
      barWrap.appendChild(label);
      chart.appendChild(barWrap);
    });
  }
  // AI 분석 요약
  const summary = document.getElementById('salaryTrendSummary');
  if (summary) {
    if (idx > 0) {
      const prev = salaryData[idx-1].amount;
      const diff = data.amount - prev;
      const percent = prev ? (diff/prev*100).toFixed(1) : 0;
      summary.textContent = `${data.month} 실수령액은 ${prev.toLocaleString()}원 대비 ${diff>=0?'+':''}${diff.toLocaleString()}원 (${percent}%) ${diff>=0?'증가':'감소'}했습니다. ${data.summary}`;
    } else {
      summary.textContent = `${data.month} 실수령액: ${data.amount.toLocaleString()}원. ${data.summary}`;
    }
  }
  // 인덱스 LocalStorage 저장
  localStorage.setItem('salaryMonthIdx', idx);
}

// === 드로어(좌측 메뉴/우측 알림) ===
function openDrawer(type) {
  const overlay = document.getElementById('drawerOverlay');
  const leftDrawer = document.getElementById('sideDrawer');
  const rightDrawer = document.getElementById('notificationDrawer');
  overlay.style.display = 'block';
  if (type === 'left') {
    leftDrawer.style.display = 'flex';
    setTimeout(() => leftDrawer.classList.add('show'), 10);
  } else if (type === 'right') {
    rightDrawer.style.display = 'flex';
    setTimeout(() => rightDrawer.classList.add('show'), 10);
    renderNotificationList();
  }
}
function closeDrawer() {
  const overlay = document.getElementById('drawerOverlay');
  const leftDrawer = document.getElementById('sideDrawer');
  const rightDrawer = document.getElementById('notificationDrawer');
  leftDrawer.classList.remove('show');
  rightDrawer.classList.remove('show');
  setTimeout(() => {
    leftDrawer.style.display = 'none';
    rightDrawer.style.display = 'none';
    overlay.style.display = 'none';
  }, 180);
}
// 햄버거/알림/닫기/오버레이/ESC 이벤트 연결
function setupDrawerEvents() {
  const menuBtn = document.getElementById('menuButton');
  const notifBtn = document.querySelector('.icon-btn[aria-label="알림"]');
  const overlay = document.getElementById('drawerOverlay');
  const closeSide = document.getElementById('closeSideDrawer');
  const closeNotif = document.getElementById('closeNotificationDrawer');
  if (menuBtn) menuBtn.onclick = () => openDrawer('left');
  if (notifBtn) notifBtn.onclick = () => openDrawer('right');
  if (closeSide) closeSide.onclick = closeDrawer;
  if (closeNotif) closeNotif.onclick = closeDrawer;
  if (overlay) overlay.onclick = closeDrawer;
  window.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeDrawer();
  });
  // 드로어 내 탭 메뉴 클릭 시 탭 이동
  const drawerTabMenu = document.querySelector('.drawer-tab-menu');
  if (drawerTabMenu) {
    drawerTabMenu.addEventListener('click', function(e) {
      const btn = e.target.closest('.drawer-tab-item');
      if (btn && btn.dataset.tab) {
        switchTab(btn.dataset.tab);
        closeDrawer();
      }
    });
  }
}
// 알림 샘플 및 AI 알림 동적 렌더링
function renderNotificationList() {
  const list = document.getElementById('notificationList');
  if (!list) return;
  // 샘플 알림 데이터 (실제 서비스에서는 서버/DB에서 받아옴)
  const notifications = [
    { type: 'success', text: '출근체크가 정상적으로 완료되었습니다.', time: '09:01' },
    { type: 'info', text: '연차신청이 승인되었습니다.', time: '08:45' },
    { type: 'ai', text: 'AI 분석: 이번 주 근무 패턴이 평소와 다릅니다. 집중도가 높았던 날이 있어요.', time: '어제' },
    { type: 'ai', text: 'AI 분석: 최근 3일간 피로도가 증가했습니다. 충분한 휴식을 권장합니다.', time: '2일 전' }
  ];
  // 실제 근태 데이터와 연동 시, appData 등에서 동적으로 추가 가능
  list.innerHTML = notifications.map(n =>
    `<div class="notification-item notification-${n.type}">
      <div class="notification-text">${n.text}</div>
      <div class="notification-time">${n.time}</div>
    </div>`
  ).join('');
}
// === 드로어 이벤트 연결을 DOMContentLoaded에서 실행 ===
document.addEventListener('DOMContentLoaded', function() {
  setupDrawerEvents();
});
// === 드로어 관련 스타일은 style.css에 추가 ===

// === 퇴근 인증 팝업 내 카카오맵 연동 (공식 문서 방식) ===
let kakaoMap, kakaoMarker;
function showKakaoMapWithCurrentLocation() {
  const mapContainer = document.getElementById('gpsMap');
  if (!mapContainer) return;
  // 지도 중복 생성 방지
  if (!kakaoMap) {
    kakaoMap = new kakao.maps.Map(mapContainer, {
      center: new kakao.maps.LatLng(37.5665, 126.9780),
      level: 3
    });
  }
  // 위치 마커
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(pos) {
      const lat = pos.coords.latitude, lng = pos.coords.longitude;
      const loc = new kakao.maps.LatLng(lat, lng);
      if (!kakaoMarker) {
        kakaoMarker = new kakao.maps.Marker({ map: kakaoMap, position: loc });
      } else {
        kakaoMarker.setPosition(loc);
      }
      kakaoMap.setCenter(loc);
      document.getElementById('gpsLocation').textContent = `현재 위치: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }, function() {
      document.getElementById('gpsLocation').textContent = '위치 정보를 가져올 수 없습니다.';
    });
  } else {
    document.getElementById('gpsLocation').textContent = '이 브라우저는 위치 정보를 지원하지 않습니다.';
  }
}
// 팝업 열릴 때 지도 표시
function setupCheckOutModalMap() {
  const checkOutBtn = document.getElementById('checkOutBtn');
  if (checkOutBtn) {
    checkOutBtn.addEventListener('click', () => {
      setTimeout(() => {
        if (document.getElementById('panelGps').style.display !== 'none') {
          showKakaoMapWithCurrentLocation();
        }
      }, 200);
    });
  }
  const tabGps = document.getElementById('tabGps');
  if (tabGps) {
    tabGps.addEventListener('click', () => {
      setTimeout(() => {
        if (document.getElementById('panelGps').style.display !== 'none') {
          showKakaoMapWithCurrentLocation();
        }
      }, 200);
    });
  }
}
document.addEventListener('DOMContentLoaded', function() {
  setupCheckOutModalMap();
});
// ... 기존 loadKakaoMapScript, window.kakao.maps.load 등 동적 로드 관련 코드 완전히 제거 ...

const KAKAO_MAP_API_KEY = '3240ec745b3810cc90a72a52ae553e20';