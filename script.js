//初期設定はじめ
const seatGrid = document.getElementById('seatGrid');
    let selectedSeatId = null;
    let selectedSeatEl = null;
    let leaveTargetSeat = null;
    let pendingMoveInfo = null;
    let inputNumberStr = '';
    let gradeColorMap = {};
    let logData = JSON.parse(localStorage.getItem('seatLogs') || '[]');
    let passwordInput = '';
    let logoutTimes = []; // 有効なログアウト時刻のリスト
    let logoutTimer = null; // setTimeout のIDを保持
    let is2FUnlocked = false; // 2階の解放状態（初期はロック）


function getScriptURL() {
  return 'https://script.google.com/macros/s/AKfycbywSY_TX4wDGUPEikeNfE99WxjYhXThELThbn_wNcsujXs5EvXxAHL2LZtZ8JAABdMH/exec';
}
//初期設定おわり

//★ここから先座席作成機能★
//座席の作成方法を設定
    const seatIds1F = Array.from({length: 70}, (_, i) => `1${String(i + 1).padStart(2, '0')}`);
    const seatIds2F = Array.from({length: 80}, (_, i) => `2${String(i + 1).padStart(2, '0')}`);
    const allSeatIds = [...seatIds1F, ...seatIds2F];

//座席作成機能
function createSeats() {
  seatGrid.innerHTML = '';

// ▶ 座席レイアウト
  const layoutPerRow = [0, 1, 2, null, 3, 4, 5, 6, null, 7, 8, 9]; // 12列構成

 // ▶ 1階ラベルを追加
  const label1F = document.createElement('div');
  label1F.textContent = '　 　　【1 階】校舎側→';
  label1F.style.gridColumn = '1 / -1';
  label1F.style.fontSize = '26px';
  label1F.style.margin = '10px 0';
  label1F.style.fontWeight = 'bold';
  seatGrid.appendChild(label1F);

  // ▶ 1階（7行）を作成
  let index = 0;
  for (let row = 0; row < 7; row++) {
    layoutPerRow.forEach(pos => {
      if (pos === null) {
        const spacer = document.createElement('div');
        spacer.className = 'spacer';
        seatGrid.appendChild(spacer);
      } else {
        const seatId = seatIds1F[index++];
        const seat = document.createElement('div');
        seat.className = 'seat';
        seat.dataset.id = seatId;
        seat.innerHTML = `<div class="seat-id-label">${seatId}</div>`;
        seat.addEventListener('click', () => selectSeat(seat));
        seatGrid.appendChild(seat);
      }
    });
  }

  // ▶ スペーサー行（1階と2階の間）を追加
  const spacerRow = document.createElement('div');
  spacerRow.style.gridColumn = '1 / -1';
  spacerRow.style.height = '40px';
  seatGrid.appendChild(spacerRow);

// ▶ 2階ラベルを追加
  const label2F = document.createElement('div');
  label2F.textContent = '　　　 【2 階】校舎側→';
  label2F.style.gridColumn = '1 / -1';
  label2F.style.fontSize = '26px';
  label2F.style.margin = '10px 0';
  label2F.style.fontWeight = 'bold';
  seatGrid.appendChild(label2F);

  // ▶ 2階（8行）を作成
  index = 0;
  for (let row = 0; row < 8; row++) {
    layoutPerRow.forEach(pos => {
      if (pos === null) {
        const spacer = document.createElement('div');
        spacer.className = 'spacer';
        seatGrid.appendChild(spacer);
      } else {
        const seatId = seatIds2F[index++];
        const seat = document.createElement('div');
        seat.className = 'seat';
        seat.dataset.id = seatId;
        seat.innerHTML = `<div class="seat-id-label">${seatId}</div>`;
        seat.addEventListener('click', () => selectSeat(seat));
        seatGrid.appendChild(seat);
      }
    });
  }
// ▶利用率を更新
  restoreSeatState();
  updateOccupancyRate();
}
//★★ここまで座席作成機能★★


//空白挿入機能
function insertSpacer() {
  const br = document.createElement('div');
  br.style.gridColumn = '1 / -1';
  br.style.height = '40px';
  seatGrid.appendChild(br);
}


//★ここから先タブを開いた時の初期動作★
//■読み込み機能全体統括■
window.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('loadingOverlay').style.display = 'flex';

  try {
    await loadGradeColors();
    createSeats();
    await loadUnavailableSeats();
    await loadAutoLogoutSettings();

    const formData = new URLSearchParams();
    formData.append('mode', 'logLoginTime');
    await fetch(getScriptURL(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });

  } catch (e) {
    alert("初期読み込み中にエラーが発生しました");
    console.error(e);
  } finally {
    document.getElementById('loadingOverlay').style.display = 'none';
  }
});


window.addEventListener('beforeunload', (e) => {
  const message = 'このシステムではリロードはできません。'
　　　　e.preventDefault()
　　　　e.returnValue = message
　　　　return message
});
//■読み込み機能全体統括（終）以下詳細機能■

//■学年カラー読み込み機能■
    async function loadGradeColors() {
  const formData = new URLSearchParams();
  formData.append('mode', 'getGradeColors');

  try {
    const res = await fetch(getScriptURL(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });

    gradeColorMap = await res.json(); // ← グローバル変数に保持
    console.log("Grade-Color Map:", gradeColorMap);
  } catch (e) {
    console.error("Grade color 読み込みエラー", e);
    alert("座席色設定の読み込みに失敗しました");
  }
}
//■学年カラー読み込み機能（終）■

//■使用不可能座席読み込み機能■
    async function loadUnavailableSeats() {
  const formData = new URLSearchParams();
  formData.append('mode', 'getUnavailableSeats');

  try {
    const res = await fetch(getScriptURL(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const result = await res.json();
    const unavailableSeats = result.unavailable;
    markUnavailableSeats(unavailableSeats);
    updateOccupancyRate(); 
  } catch (error) {
    alert("利用不可能座席の読み込みに失敗しました");
    console.error("UnavailableSeats 読み込みエラー", error);
  }
}
//■使用不可能座席読み込み機能（終）■

//■使用不可能座席表示機能■
function markUnavailableSeats(unavailableSeatIds) {
  unavailableSeatIds.forEach(allSeatIds => {
    const seat = document.querySelector(`.seat[data-id='${allSeatIds}']`);
    if (seat) {
      seat.classList.add('unavailable');
      seat.style.background = "#999";
      seat.style.color = "#333";
      seat.style.cursor = "not-allowed";
      seat.style.pointerEvents = "none";
      seat.title = "使用不可";

        // 「使用不可」表示を設定
      const idLabel = seat.querySelector('.seat-id-label');
      seat.innerHTML = idLabel ? idLabel.outerHTML + `<div class="unavailable-label">使用不可</div>` : `<div class="unavailable-label">使用不可</div>`;
    }
  });
}
//■使用不可能座席表示機能（終）■

//■自動ログアウト機能■
async function loadAutoLogoutSettings() {
  const formData = new URLSearchParams();
  formData.append('mode', 'getLogoutTimes');

  try {
    const res = await fetch(getScriptURL(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });

    const result = await res.json();
    const today = new Date();
    const day = today.getDay(); // 0=日, 6=土

    const isWeekend = (day === 0 || day === 6); // 土日

    logoutTimes = result.times
      .filter(row => isWeekend ? row.enabledB : row.enabledA)
      .map(row => row.time)
      .sort(); // 文字列で時刻順にソート

    scheduleNextLogout();
    displayLogoutTime();

  } catch (e) {
    console.error("ログアウト時刻の取得に失敗", e);
  }
}


function scheduleNextLogout() {
  if (logoutTimer) clearTimeout(logoutTimer);

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  for (const timeStr of logoutTimes) {
    const [h, m] = timeStr.split(':').map(Number);
    const targetMinutes = h * 60 + m;

    if (targetMinutes > nowMinutes) {
      const diffMs = (targetMinutes - nowMinutes) * 60 * 1000 - now.getSeconds() * 1000;
      logoutTimer = setTimeout(handleLogoutTrigger, diffMs);
      console.log(`次回自動ログアウトは ${timeStr} に設定`);
      return;
    }
  }

  console.log("本日の自動ログアウト対象時刻なし");
}

function handleLogoutTrigger() {
  console.log("自動ログアウト実行");
  executeLogout();  // 確認を飛ばして直接ログアウト処理を実行
}

function displayLogoutTime() {
  const logoutDisplay = document.getElementById('logoutTimeDisplay');
  if (!logoutDisplay) return;

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  for (const timeStr of logoutTimes) {
    const [h, m] = timeStr.split(':').map(Number);
    const targetMinutes = h * 60 + m;
    if (targetMinutes > nowMinutes) {
      logoutDisplay.textContent = `次回自動ログアウト時刻：${timeStr}`;
      return;
    }
  }
  logoutDisplay.textContent = '本日自動ログアウトなし';
}
//■自動ログアウト機能（終）■
//★★ここまでタブを開いた時の初期動作★★



//★ここからログアウト機能★
function executeLogout() {
  // ▶ ログの生成
  const csv = generateCSV();

  // ▶ ログをスプレッドシートへ送信
  const formData = new URLSearchParams();
  formData.append('mode', 'saveCSV');
  formData.append('csv', csv);

  fetch(getScriptURL(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString()
  })
  .then(res => res.json())
  .then(data => {
    const uniqueUsers = [...new Set(logData.map(log => log.id))];
    const count = uniqueUsers.length;

    // ▶統計データをスプレッドシートへ送信
    const statData = new URLSearchParams();
    statData.append('mode', 'logLogoutData');
    statData.append('count', count);

    fetch(getScriptURL(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: statData.toString()
    }).then(console.log).catch(console.error);

    console.log('CSV保存結果:', data);

    clearAllSeats();
    saveLogs();

    //setTimeout(() => {
     // window.close();
   // }, 1000);

          // ログアウト完了モーダル表示
    document.getElementById('logoutCompleteModal').style.display = 'flex';
  });
}
//★★ここまでログアウト機能★★



//★ここから諸々のモーダル表示機能★
//ログアウト確認モーダル
function showLogoutConfirm() {
  document.getElementById('logoutModal').style.display = 'flex';
}

//ログアウト
function handleLogout(answer) {
  document.getElementById('logoutModal').style.display = 'none';
  if (!answer) return;

  executeLogout();
}

    // CSV文字列を返す共通関数
function generateCSV() {
  let csv = 'ID,座席番号,登録番号,名前,登録時間,退席時間\n';
  logData.forEach(log => {
    csv += `${log.id},${log.seatId},${log.number},${log.name},${log.checkIn},${log.checkOut}\n`;
  });
  return csv;
}

//全クリア確認モーダル
function showClearConfirm() {
  document.getElementById('clearConfirmModal').style.display = 'flex';
}

//全クリア実行
function handleClearConfirm(answer) {
  document.getElementById('clearConfirmModal').style.display = 'none';
  if (answer) {
    clearAllSeats();
  }
}
//★★ここまで諸々のモーダル表示機能★★



//★ここから管理者設定画面内の機能★
//ログ表示機能
function showLogs() {
  let csv = 'ID,座席番号,登録番号,名前,登録時間,退席時間\n';
  logData.forEach(log => {
    csv += `${log.id},${log.seatId},${log.number},${log.name},${log.checkIn},${log.checkOut}\n`;
  });
  const textarea = document.getElementById('logOutputModal');
  textarea.value = csv;
  document.getElementById('logModal').style.display = 'flex';
}

//管理者画面表示機能
function showAdminConfirm() {
  document.getElementById('adminConfirmModal').style.display = 'flex';
}

function handleAdminConfirm(answer) {
  document.getElementById('adminConfirmModal').style.display = 'none';
  if (answer) {
    window.open('https://docs.google.com/spreadsheets/d/139WkNoBoTDNo7RddbsWPrHjRQcraW3OqpWxubm24c2U/edit?gid=0#gid=0');
  }
}


//座席全クリア機能
    function clearAllSeats() {
      document.querySelectorAll('.seat').forEach(seat => {
        const idLabel = seat.querySelector('.seat-id-label');

        // 使用不可の座席はスキップ
        if (seat.classList.contains('unavailable')) return;
        
        seat.classList.remove('active', 'red', 'green', 'blue', 'orange');
        seat.style.background = '';
        seat.style.color = '';
        seat.innerHTML = idLabel ? idLabel.outerHTML : '';
      });
      logData = [];
      localStorage.removeItem('seatLogs');
        updateOccupancyRate();

    }
//★★ここまで管理者設定画面内の機能★★




//ログセーブ機能
    function saveLogs() {
      localStorage.setItem('seatLogs', JSON.stringify(logData));
    }

//退席処理機能
function restoreSeatState() {
  logData.forEach(log => {
    if (!log.checkOut) {
      const seatEl = document.querySelector(`.seat[data-id='${log.seatId}']`);
      if (seatEl) {
        const firstDigit = log.number.charAt(0);
        seatEl.classList.remove('red', 'green', 'blue', 'orange');
        seatEl.style.background = '';

        const gradeColor = gradeColorMap[firstDigit];
        seatEl.classList.add('active');
        if (gradeColor) {
          seatEl.style.background = gradeColor;
          seatEl.style.color = '#fff';
        } else {
          seatEl.classList.add('active', 'orange');
        }

        const idLabel = seatEl.querySelector('.seat-id-label');
        seatEl.innerHTML = idLabel.outerHTML + `<div>${log.number}</div>` + (log.name ? `<div class="seat-label">${log.name}</div>` : '');
      }
    }
  });
}


//座席選択画面表示機能
    function selectSeat(seat) {
        inputNumberStr = '';
        updateDisplay(); 
      if (seat.classList.contains('active')) {
        leaveTargetSeat = seat;
        document.getElementById('confirmModal').style.display = 'flex';
        return;
      }
      selectedSeatId = seat.dataset.id;
      selectedSeatEl = seat;
      document.getElementById('assignModal').style.display = 'flex';
    }

//指定番号表示機能
    function inputNumber(digit) {
      if (inputNumberStr.length < 4) {
        inputNumberStr += digit;
        updateDisplay();
      }
    }

//指定番号クリア機能
    function clearNumber() {
      inputNumberStr = '';
      updateDisplay();
    }

//最後の数字削除機能
    function deleteLastDigit() {
      inputNumberStr = inputNumberStr.slice(0, -1);
      updateDisplay();
    }

//座席表更新機能
    function updateDisplay() {
      const display = document.getElementById('numberDisplay');
      display.textContent = inputNumberStr.padStart(4, '-');
    }

//ID作成機能
    function generateId() {
      return Math.random().toString(36).substr(2, 9);
    }

//登録画面入力機能
function confirmAssign() {
  const userName = document.getElementById('userName').value.trim();
  if (inputNumberStr.length !== 4) {
    alert('4桁の数字を入力してください');
    return;
  }
// ▶　使用する座席の変更確認
  const existingLog = logData.find(log => log.number === inputNumberStr && !log.checkOut);
  if (existingLog && existingLog.seatId !== selectedSeatEl.dataset.id) {
    // 移動確認モーダルの表示
    const fromSeat = existingLog.seatId;
    const toSeat = selectedSeatEl.dataset.id;
    document.getElementById('moveConfirmText').textContent =
      `${inputNumberStr} さんは\n現在 ${fromSeat} を利用中です。\n${fromSeat} 番から ${toSeat} 番に移動しますか？`;

    pendingMoveInfo = { log: existingLog, newSeatEl: selectedSeatEl, name: userName };
    document.getElementById('assignModal').style.display = 'none';
    document.getElementById('moveConfirmModal').style.display = 'flex';
    return;
  }

  // 新規登録処理
  applySeatAssignment(selectedSeatEl, inputNumberStr, userName);

}

//座席移動機能
    function confirmSeatMove(answer) {
  document.getElementById('moveConfirmModal').style.display = 'none';

  if (answer && pendingMoveInfo) {
    const { log, newSeatEl, name } = pendingMoveInfo;

    // ▶元の座席をクリア
    const oldSeatEl = document.querySelector(`.seat[data-id='${log.seatId}']`);
    if (oldSeatEl) {
      const idLabel = oldSeatEl.querySelector('.seat-id-label');
      oldSeatEl.classList.remove('active', 'red', 'green', 'blue', 'orange');
      oldSeatEl.innerHTML = idLabel ? idLabel.outerHTML : '';
    }

    // ▶ログのseatIdを更新（checkInはそのまま）
    log.seatId = newSeatEl.dataset.id;

    // ▶新しい座席を登録状態に変更
    applySeatAssignment(newSeatEl, log.number, name);

    saveLogs();
    updateOccupancyRate();
// 移動後の処理
//updateVirtualSeatStatus(oldSeatEl.dataset.id, "empty");
//updateVirtualSeatStatus(log.seatId, "occupied");



  }

  pendingMoveInfo = null;
}

//座席表上の表示機能
function applySeatAssignment(seatEl, number, name) {
  const firstDigit = number.charAt(0);
  seatEl.classList.remove('red', 'green', 'blue', 'orange');
  seatEl.style.background = ''; // 旧スタイルリセット

// クラスを追加
const colorClass = gradeColorMap[firstDigit]; // 例: "red", "green" など
seatEl.classList.add('active');
if (colorClass) {
  seatEl.classList.add(colorClass);
} else {
  seatEl.classList.add('orange'); // fallback
}

  const idLabel = seatEl.querySelector('.seat-id-label');
  seatEl.innerHTML = idLabel.outerHTML + `<div>${number}</div>` + (name ? `<div class="seat-label">${name}</div>` : '');

  // ログに新規追加（すでにある場合はスキップ）
  const existingLog = logData.find(log => log.number === number && !log.checkOut);
  if (!existingLog) {
    const id = generateId();
    const now = new Date().toLocaleString();
    logData.push({ id, seatId: seatEl.dataset.id, number, name, checkIn: now, checkOut: '' });
    saveLogs();
  }
//updateVirtualSeatStatus(seatEl.dataset.id, "occupied");
  closeAssignModal();
  updateOccupancyRate();

}


//アサイン画面クローズ機能
    function closeAssignModal() {
      document.getElementById('assignModal').style.display = 'none';
      document.getElementById('userName').value = '';
      inputNumberStr = '';
      updateDisplay();
      selectedSeatId = null;
      selectedSeatEl = null;
    }

//退席処理機能
    function confirmLeave(answer) {
      document.getElementById('confirmModal').style.display = 'none';
      if (answer && leaveTargetSeat) {
        const idLabel = leaveTargetSeat.querySelector('.seat-id-label');
        leaveTargetSeat.classList.remove('active', 'red', 'green', 'blue', 'orange');
        leaveTargetSeat.innerHTML = idLabel ? idLabel.outerHTML : '';
        const seatId = leaveTargetSeat.dataset.id;
        const now = new Date().toLocaleString();
        const log = logData.find(entry => entry.seatId === seatId && !entry.checkOut);
        if (log) log.checkOut = now;
        saveLogs();
        updateOccupancyRate(); 
//        updateVirtualSeatStatus(seatId, "empty");
      }
      leaveTargetSeat = null;
    }



//座席利用率表示機能
    function updateOccupancyRate() {
  const allSeats = document.querySelectorAll('.seat');
  const unavailable = document.querySelectorAll('.seat.unavailable');

  const countOccupied = idList => idList.filter(id => {
    const el = document.querySelector(`.seat[data-id='${id}']`);
    return el && el.classList.contains('active');
  }).length;

  const countUnavailable = idList => idList.filter(id => {
    const el = document.querySelector(`.seat[data-id='${id}']`);
    return el && el.classList.contains('unavailable');
  }).length;

  const available1F = seatIds1F.length - countUnavailable(seatIds1F);
  const occupied1F = countOccupied(seatIds1F);
  const rate1F = available1F ? Math.round((occupied1F / available1F) * 1000) / 10 : 0;

  const available2F = seatIds2F.length - countUnavailable(seatIds2F);
  const occupied2F = countOccupied(seatIds2F);
  const rate2F = available2F ? Math.round((occupied2F / available2F) * 1000) / 10 : 0;

  document.getElementById('occupancyRate').innerHTML = `
    1階利用率：${rate1F}%　｜　2階利用率：${rate2F}%`;

// 二階の制限処理（60%未満なら初期ロック、超えたら解放して以後ロックしない）★一時的に機能停止
//const overlay = document.getElementById('overlay2F');

//if (!is2FUnlocked) {
//  if (rate1F < 60) {
//    // ロックを表示
//    overlay.style.display = 'flex';

//    seatIds2F.forEach(id => {
//      const seat = document.querySelector(`.seat[data-id='${id}']`);
//      if (seat && !seat.classList.contains('unavailable')) {
//        seat.classList.add('disabled-2f');
//        seat.style.pointerEvents = 'none';
//        seat.style.opacity = '0.4';
//      }
//    });
//  } else {
    // 初めて60%を超えた → 解放
//    is2FUnlocked = true;
//    overlay.style.display = 'none';

//    seatIds2F.forEach(id => {
//      const seat = document.querySelector(`.seat[data-id='${id}']`);
//      if (seat && !seat.classList.contains('unavailable')) {
//        seat.classList.remove('disabled-2f');
 //       seat.style.pointerEvents = '';
 //       seat.style.opacity = '';
//      }
//    });
//  }
//}
}



//パスワード入力機能
function inputPasswordDigit(d) {
  if (passwordInput.length < 6) {
    passwordInput += d;
    updatePasswordDisplay();
  }
}

//パスワード入力欄アップデート機能（一つタップするたびに--の表示を変更）
function updatePasswordDisplay() {
  document.getElementById('passwordDisplay').textContent = passwordInput.padStart(6, '-');
}

//パスワード入力欄C機能
function clearPassword() {
  passwordInput = '';
  updatePasswordDisplay();
}

//パスワード入力欄最後の文字デリート機能
function deleteLastPasswordDigit() {
  passwordInput = passwordInput.slice(0, -1);
  updatePasswordDisplay();
}

//パスワード照会機能
async function verifyPassword() {
  const formData = new URLSearchParams();
  formData.append('mode', 'getPassword');

  try {
    const res = await fetch(getScriptURL(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });
    const result = await res.json();
    if (passwordInput === result.password) {
      document.getElementById('loginModal').style.display = 'none';
      document.getElementById('settingsModal').style.display = 'flex';
        clearPassword()
    } else {
      alert('パスワードが違います');
      clearPassword();
    }
  } catch (e) {
    alert('パスワード取得に失敗しました');
  }
}

//外部で座席利用状況を確認する機能
//function updateVirtualSeatStatus(seatId, status) {
//  fetch("https://script.google.com/macros/s/AKfycby3PE9HmSM5PCl2stPxsZf0Sr9giWgp3ceTu8EKoQKZBe0mBEePf0yAP-3-MF7SX4u8/exec", {
//    method: "POST",
//    headers: {
//      "Content-Type": "application/json"
//    },
//    body: JSON.stringify({ seatId, status })
//  })
//  .then(response => response.json())
//  .then(data => {
//    if (!data.success) {
//      console.error("VirtualSeat update failed:", data.message);
//    }
//  })
//  .catch(error => {
//    console.error("Error updating VirtualSeat:", error);
//  });
//}

