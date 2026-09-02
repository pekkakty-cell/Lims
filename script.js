// detail.html이 지금 어떤 Audit 레코드를 보여주고 있는지(?id=값). "수정→저장" 시 이 값으로 어떤 데이터를 업데이트할지 찾음
let currentDetailRecordId = null;

// 백엔드(eGovFrame + PostgreSQL) API 주소. 로컬에는 localStorage를 캐시로 계속 쓰고,
// 여기 연결이 되면 서버 데이터로 덮어써서 새로고침 없이도 최신 데이터를 보여줌
const API_BASE = "http://localhost:8080/api";

function isoToDotDate(isoDate) {
  return isoDate ? isoDate.replaceAll("-", ".") : "";
}

function dotToIsoDate(dotDate) {
  return dotDate ? dotDate.trim().split(" ")[0].replaceAll(".", "-") : null;
}

// 로그인 상태 저장 키. 값이 있으면 로그인된 것으로 취급 (다른 페이지들의 인증 가드에서 씀)
const AUTH_KEY = "lims-auth";
const SAVED_ID_KEY = "lims-saved-id";

function getAuth() {
  const saved = localStorage.getItem(AUTH_KEY);
  return saved ? JSON.parse(saved) : null;
}

// login.html: 아이디/비밀번호로 서버에 실제 로그인 요청
if (document.getElementById("login-submit-btn")) {
  const loginIdInput = document.getElementById("login-id-input");
  const loginPwInput = document.getElementById("login-pw-input");
  const loginRememberCheckbox = document.getElementById("login-remember-checkbox");
  const loginErrorEl = document.getElementById("login-error");
  const loginSubmitBtn = document.getElementById("login-submit-btn");

  const savedLoginId = localStorage.getItem(SAVED_ID_KEY);
  if (savedLoginId) {
    loginIdInput.value = savedLoginId;
    loginRememberCheckbox.checked = true;
  }

  let loginFailCount = 0;

  function showLoginError(text) {
    loginErrorEl.textContent = text;
    loginErrorEl.style.display = "";
  }

  function attemptLogin() {
    const id = loginIdInput.value.trim();
    const password = loginPwInput.value;

    if (!id || !password) {
      showLoginError("아이디와 비밀번호를 입력해주세요.");
      return;
    }

    fetch(API_BASE + "/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: id, password: password })
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (result) {
        if (!result.ok) {
          loginFailCount += 1;
          showLoginError("아이디 또는 비밀번호를 다시 확인하세요. 실패 횟수 : " + loginFailCount);
          return;
        }

        if (loginRememberCheckbox.checked) {
          localStorage.setItem(SAVED_ID_KEY, id);
        } else {
          localStorage.removeItem(SAVED_ID_KEY);
        }

        localStorage.setItem(AUTH_KEY, JSON.stringify({ id: result.data.id, name: result.data.name, dept: result.data.dept }));
        saveProfile({ name: result.data.name, dept: result.data.dept, email: "" });

        window.location.href = "index.html";
      })
      .catch(function () {
        showLoginError("서버에 연결할 수 없습니다. 백엔드가 켜져 있는지 확인해주세요.");
      });
  }

  loginSubmitBtn.addEventListener("click", attemptLogin);
  wireEnterToSearch([loginIdInput, loginPwInput], loginSubmitBtn);
}

// 공급사 Audit 목록 기본 데이터 (파일 아래쪽 getAudits/saveAudits보다 먼저 선언해야
// 이 아래에 있는 "?id= 조회" 코드가 실행 시점에 바로 쓸 수 있음)
const AUDIT_KEY = "lims-audits";
const AUDIT_SEED = [
  {
    id: "MFA-0000002",
    status: "진행중",
    supplier: "Nikka Finetech",
    title: "260316 삼성파운드리 원재료 집중점검 요청",
    evalDate: "2026.03.27",
    visitDate: "2026.09.11",
    result: "종합결과",
    resultSummary: "평가결과 요약",
    aiCount: "0/2",
    creator: "박신영",
    createdAt: "2026.03.27 09:49:24",
    modifier: "관리자",
    modifiedAt: "2026.08.12 11:02:16",
    tabLabel: "260316 삼성파운드리 원재료 집중점검 요청 A",
    detailUrl: "detail.html?id=MFA-0000002"
  }
];

// 공급사(vendor-detail.html) 기본 데이터 — 이 프로토타입엔 공급사가 하나뿐이라 목록이 아니라 단일 레코드로 관리
const VENDOR_KEY = "lims-vendor";
const VENDOR_SEED = { id: "VND-0000057", customerName: "Nikka Finetech" };

// Audit 추가 화면의 "공급사 검색" 모달용 공급사 목록 (위의 단일 공급사와는 별개로, 서버의 전체 목록을 캐시)
const VENDOR_LIST_KEY = "lims-vendor-list";

// vendor-detail.html이 지금 어떤 공급사(?id=값)를 보여주고 있는지. 없으면 기본 공급사를 보여줌
const vendorDetailParams = new URLSearchParams(window.location.search);
const vendorDetailId = vendorDetailParams.get("id");

function getVendor() {
  const saved = localStorage.getItem(VENDOR_KEY);
  if (saved) {
    return JSON.parse(saved);
  }
  localStorage.setItem(VENDOR_KEY, JSON.stringify(VENDOR_SEED));
  return VENDOR_SEED;
}

// 로컬 캐시(localStorage)만 갱신. 서버로는 보내지 않음 — 서버에서 받아온 데이터를 캐시에 반영할 때 씀
function cacheVendor(vendor) {
  localStorage.setItem(VENDOR_KEY, JSON.stringify(vendor));
}

// 사용자가 실제로 수정/저장했을 때 씀 — 로컬 캐시 + 서버(API) 둘 다 갱신
function saveVendor(vendor) {
  cacheVendor(vendor);
  fetch(API_BASE + "/vendors/" + encodeURIComponent(vendor.id), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(vendor)
  }).catch(function (err) {
    console.error("공급사 서버 저장 실패 (로컬에는 저장됨):", err);
  });
}

function getVendorList() {
  const saved = localStorage.getItem(VENDOR_LIST_KEY);
  return saved ? JSON.parse(saved) : [getVendor()];
}

function cacheVendorList(list) {
  localStorage.setItem(VENDOR_LIST_KEY, JSON.stringify(list));
}

// 서버에서 전체 공급사 목록을 받아와 캐시에 반영 (서버가 꺼져 있으면 로컬 캐시 그대로 사용)
function refreshVendorListFromServer(callback) {
  fetch(API_BASE + "/vendors")
    .then(function (res) { return res.ok ? res.json() : null; })
    .then(function (list) {
      if (list) {
        cacheVendorList(list);
      }
      if (callback) {
        callback();
      }
    })
    .catch(function () {
      if (callback) {
        callback();
      }
    });
}

// 지금 vendor-detail.html이 보여줘야 할 공급사를 찾음: ?id=가 있으면 그 공급사, 없으면 기본 공급사
function getCurrentVendorRecord() {
  if (!vendorDetailId) {
    return getVendor();
  }
  const found = getVendorList().find(function (v) {
    return v.id === vendorDetailId;
  });
  return found || { id: vendorDetailId, customerName: "" };
}

// 공급사 하나를 저장 — 목록 캐시, (기본 공급사면) 기본 공급사 캐시, 서버까지 모두 갱신
function saveVendorRecord(vendor) {
  const list = getVendorList();
  const idx = list.findIndex(function (v) {
    return v.id === vendor.id;
  });
  if (idx >= 0) {
    list[idx] = vendor;
  } else {
    list.push(vendor);
  }
  cacheVendorList(list);

  if (vendor.id === getVendor().id) {
    cacheVendor(vendor);
  }

  fetch(API_BASE + "/vendors/" + encodeURIComponent(vendor.id), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(vendor)
  }).catch(function (err) {
    console.error("공급사 서버 저장 실패 (로컬에는 저장됨):", err);
  });
}

// vendor-detail.html이면 저장된 공급사 데이터로 화면 내용을 채움
function renderVendorFields() {
  if (document.body.dataset.pageType !== "vendor") {
    return;
  }
  const vendor = getCurrentVendorRecord();
  const vendorIdField = document.getElementById("vendor-id-field");
  const vendorNameField = document.getElementById("vendor-name-field");
  const vendorTreeItem = document.getElementById("vendor-tree-item");

  if (vendorIdField) {
    vendorIdField.textContent = vendor.id;
  }
  if (vendorNameField) {
    vendorNameField.textContent = vendor.customerName;
  }
  if (vendorTreeItem) {
    vendorTreeItem.textContent = vendor.customerName;
  }
  document.body.dataset.tabLabel = vendor.customerName;
}

renderVendorFields();

// 서버에서 최신 공급사 데이터를 받아와 캐시/화면에 반영 (서버가 꺼져 있으면 그냥 로컬 데이터로 계속 동작)
if (document.body.dataset.pageType === "vendor") {
  fetch(API_BASE + "/vendors/" + encodeURIComponent(getCurrentVendorRecord().id))
    .then(function (res) { return res.ok ? res.json() : null; })
    .then(function (data) {
      if (!data) {
        return;
      }
      const list = getVendorList();
      const idx = list.findIndex(function (v) { return v.id === data.id; });
      if (idx >= 0) {
        list[idx] = data;
      } else {
        list.push(data);
      }
      cacheVendorList(list);
      if (data.id === getVendor().id) {
        cacheVendor(data);
      }
      renderVendorFields();
    })
    .catch(function () {});
}

// 연결정보: ⌃(접기)는 아래 목록 숨기고/보이기, ✕(닫기)는 연결정보 섹션 전체 숨김
document.querySelectorAll('.tree-icon-btn[title="접기"]').forEach(function (btn) {
  btn.addEventListener("click", function () {
    const section = btn.closest(".sidebar-section");
    const list = section ? section.querySelector(".link-list") : null;
    if (!list) {
      return;
    }
    const isHidden = list.style.display === "none";
    list.style.display = isHidden ? "" : "none";
    btn.textContent = isHidden ? "⌃" : "⌄";
  });
});

document.querySelectorAll(".connection-refresh-btn").forEach(function (btn) {
  btn.addEventListener("click", function () {
    const section = btn.closest(".sidebar-section");
    if (!section) {
      return;
    }
    const list = section.querySelector(".link-list");
    const collapseBtn = section.querySelector('.tree-icon-btn[title="접기"]');
    if (list) {
      list.style.display = "";
    }
    if (collapseBtn) {
      collapseBtn.textContent = "⌃";
    }
  });
});

document.querySelectorAll('.tree-icon-btn[title="닫기"]').forEach(function (btn) {
  btn.addEventListener("click", function () {
    const section = btn.closest(".sidebar-section");
    if (section) {
      section.style.display = "none";
    }
  });
});

// 검색바 커스텀 드롭다운(상태/날짜선택): 클릭하면 열리고, 옵션 클릭하면 선택됨
document.querySelectorAll(".search-select").forEach(function (select) {
  const trigger = select.querySelector(".search-select-trigger");
  const searchInput = select.querySelector(".search-select-search-input");
  const options = select.querySelectorAll(".search-select-option");

  trigger.addEventListener("click", function (event) {
    event.stopPropagation();

    document.querySelectorAll(".search-select.open").forEach(function (other) {
      if (other !== select) {
        other.classList.remove("open");
      }
    });

    select.classList.toggle("open");

    if (select.classList.contains("open") && searchInput) {
      searchInput.value = "";
      options.forEach(function (option) {
        option.classList.remove("hidden-option");
      });
      searchInput.focus();
    }
  });

  options.forEach(function (option) {
    option.addEventListener("click", function () {
      trigger.textContent = option.dataset.value;
      select.classList.remove("open");
    });
  });

  if (searchInput) {
    searchInput.addEventListener("click", function (event) {
      event.stopPropagation();
    });

    searchInput.addEventListener("input", function () {
      const query = searchInput.value.trim().toLowerCase();
      options.forEach(function (option) {
        const matches = option.textContent.toLowerCase().includes(query);
        option.classList.toggle("hidden-option", !matches);
      });
    });
  }
});

document.addEventListener("click", function () {
  document.querySelectorAll(".search-select.open").forEach(function (select) {
    select.classList.remove("open");
  });
});

// From/To 날짜칸: 📅는 달력, 🕐는 30분 단위 시간 목록. 텍스트칸에 "날짜 시간"으로 합쳐서 표시
function setupDateTimeField(textInputId, dateBtnId, timeBtnId) {
  const textInput = document.getElementById(textInputId);
  const dateBtn = document.getElementById(dateBtnId);
  const timeBtn = document.getElementById(timeBtnId);

  if (!textInput || !dateBtn || !timeBtn) {
    return;
  }

  const hiddenDateInput = document.createElement("input");
  hiddenDateInput.type = "date";
  hiddenDateInput.className = "ai-hidden-date-input";
  dateBtn.insertAdjacentElement("afterend", hiddenDateInput);

  function getParts() {
    const raw = textInput.value.trim();
    const spaceIndex = raw.indexOf(" ");
    if (spaceIndex === -1) {
      return { datePart: raw, timePart: "" };
    }
    return { datePart: raw.slice(0, spaceIndex), timePart: raw.slice(spaceIndex + 1) };
  }

  function setParts(datePart, timePart) {
    textInput.value = [datePart, timePart].filter(function (part) {
      return part;
    }).join(" ");
  }

  dateBtn.addEventListener("click", function () {
    if (hiddenDateInput.showPicker) {
      hiddenDateInput.showPicker();
    } else {
      hiddenDateInput.focus();
    }
  });

  hiddenDateInput.addEventListener("change", function () {
    const parts = getParts();
    setParts(formatIsoDateForDisplay(hiddenDateInput.value), parts.timePart);
  });

  const timeMenu = document.createElement("div");
  timeMenu.className = "time-picker-menu";
  for (let hour = 0; hour < 24; hour++) {
    [0, 30].forEach(function (minute) {
      const label = String(hour).padStart(2, "0") + ":" + String(minute).padStart(2, "0");
      const item = document.createElement("div");
      item.className = "time-picker-item";
      item.textContent = label;
      item.addEventListener("click", function () {
        const parts = getParts();
        setParts(parts.datePart, label);
        timeMenu.classList.remove("open");
      });
      timeMenu.appendChild(item);
    });
  }
  timeBtn.insertAdjacentElement("afterend", timeMenu);

  timeBtn.addEventListener("click", function (event) {
    event.stopPropagation();
    document.querySelectorAll(".time-picker-menu.open").forEach(function (menu) {
      if (menu !== timeMenu) {
        menu.classList.remove("open");
      }
    });
    timeMenu.classList.toggle("open");
  });
}

setupDateTimeField("from-input", "from-date", "from-time");
setupDateTimeField("to-input", "to-date", "to-time");

// 시간 없이 날짜만 있는 필드(예: A/I List 검색바의 기한): 📅 누르면 달력, 고르면 텍스트칸에 채움
function setupSimpleDateField(textInputId, dateBtnId) {
  const textInput = document.getElementById(textInputId);
  const dateBtn = document.getElementById(dateBtnId);

  if (!textInput || !dateBtn) {
    return;
  }

  const hiddenDateInput = document.createElement("input");
  hiddenDateInput.type = "date";
  hiddenDateInput.className = "ai-hidden-date-input";
  dateBtn.insertAdjacentElement("afterend", hiddenDateInput);

  dateBtn.addEventListener("click", function () {
    if (hiddenDateInput.showPicker) {
      hiddenDateInput.showPicker();
    } else {
      hiddenDateInput.focus();
    }
  });

  hiddenDateInput.addEventListener("change", function () {
    textInput.value = formatIsoDateForDisplay(hiddenDateInput.value);
  });
}

setupSimpleDateField("ai-filter-due", "ai-filter-due-date-btn");

document.addEventListener("click", function (event) {
  document.querySelectorAll(".time-picker-menu.open").forEach(function (menu) {
    if (!menu.contains(event.target)) {
      menu.classList.remove("open");
    }
  });
});

// 공용 모달 창: 처음 열 때 한 번만 DOM에 만들어두고 재사용
function openModal(title, bodyHtml, options) {
  let overlay = document.getElementById("app-modal-overlay");

  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "app-modal-overlay";
    overlay.className = "modal-overlay";
    overlay.innerHTML =
      '<div class="modal-box">' +
      '<div class="modal-header"><h3 id="app-modal-title"></h3><button class="modal-close-btn" id="app-modal-close-btn">✕</button></div>' +
      '<div class="modal-body" id="app-modal-body"></div>' +
      "</div>";
    document.body.appendChild(overlay);

    overlay.addEventListener("click", function (event) {
      if (event.target === overlay) {
        closeModal();
      }
    });
    document.getElementById("app-modal-close-btn").addEventListener("click", closeModal);
  }

  document.getElementById("app-modal-title").textContent = title;
  document.getElementById("app-modal-body").innerHTML = bodyHtml;
  overlay.querySelector(".modal-box").classList.toggle("modal-box-wide", !!(options && options.wide));
  overlay.classList.add("open");
}

function closeModal() {
  const overlay = document.getElementById("app-modal-overlay");
  if (overlay) {
    overlay.classList.remove("open");
  }
}

// 🪟 "ProfileCard With Window": 페이지 이동 없이 상세 화면을 그대로 띄운 플로팅 창 (iframe이라 A/I List 전환 등 상세 화면 기능이 그대로 동작함)
function openFloatingProfileCard(item) {
  const existing = document.getElementById("floating-profile-card");
  if (existing) {
    existing.remove();
  }

  const card = document.createElement("div");
  card.className = "floating-card";
  card.id = "floating-profile-card";
  card.innerHTML =
    '<div class="floating-card-titlebar">' +
    "<span>" + item.title + "</span>" +
    "<div>" +
    '<button class="floating-card-expand-btn" title="전체 화면으로 보기">⛶</button>' +
    '<button class="floating-card-close-btn" title="닫기">✕</button>' +
    "</div>" +
    "</div>" +
    '<iframe src="' + item.detailUrl + '"></iframe>';

  document.body.appendChild(card);

  card.querySelector(".floating-card-close-btn").addEventListener("click", function () {
    card.remove();
  });

  // 확대 아이콘: ID 클릭한 것과 동일하게 실제 상세 화면(탭)으로 이동
  card.querySelector(".floating-card-expand-btn").addEventListener("click", function () {
    openTab(item.tabLabel, "📄", item.detailUrl);
    window.location.href = item.detailUrl;
  });
}

// "생성" 모달: A/I List에 새 항목을 만들 때 쓰는 입력 폼 (원본 LIMS의 "추가" 버튼 화면과 동일한 구성)
function openAiCreateModal() {
  const bodyHtml =
    '<div class="info-block-header"><h3 class="section-title">일반정보</h3><span class="required-note">* 필수 입력</span></div>' +
    '<table class="info-table">' +
    "<tr>" +
    '<th><span class="required-mark">*</span>ID</th>' +
    '<td><input type="text" class="field-input" id="ai-create-id" disabled></td>' +
    "<th>상태</th>" +
    '<td><select class="field-input" id="ai-create-status"><option>진행중</option><option>완료</option><option>대기</option></select></td>' +
    "</tr>" +
    "<tr>" +
    "<th>내용</th>" +
    '<td><input type="text" class="field-input" id="ai-create-content"></td>' +
    "<th>기한</th>" +
    '<td><div class="date-input"><input type="text" id="ai-create-due"><button id="ai-create-due-btn">📅</button></div></td>' +
    "</tr>" +
    "<tr>" +
    "<th>부서/담당</th>" +
    '<td><div class="input-with-icon"><input type="text" class="field-input" id="ai-create-dept"><button class="supplier-pick-btn" id="ai-create-dept-search-btn" title="담당자 검색">🔍</button></div></td>' +
    "<th>알림 기준</th>" +
    '<td><input type="text" class="field-input" id="ai-create-alert"></td>' +
    "</tr>" +
    "</table>" +
    '<div class="modal-actions"><button id="ai-create-save-btn">저장</button><button id="ai-create-cancel-btn">취소</button></div>';

  openModal("생성", bodyHtml, { wide: true });

  setupSimpleDateField("ai-create-due", "ai-create-due-btn");

  document.getElementById("ai-create-dept-search-btn").addEventListener("click", function () {
    openUserPickerModal(function (user) {
      document.getElementById("ai-create-dept").value = user.dept + " " + user.name;
    });
  });

  document.getElementById("ai-create-cancel-btn").addEventListener("click", closeModal);

  document.getElementById("ai-create-save-btn").addEventListener("click", function () {
    const content = document.getElementById("ai-create-content").value.trim();
    addAiRow({
      status: document.getElementById("ai-create-status").value,
      content: content,
      dept: document.getElementById("ai-create-dept").value.trim(),
      due: document.getElementById("ai-create-due").value.trim()
    });
    closeModal();
    refreshAiViewsAfterChange();
  });
}

// 담당자(Users) 검색/선택 모달 — "생성" 모달 위에 별도 오버레이로 뜸 (밑에 있는 생성 모달 값이 안 지워지게)
function getUserPool() {
  return [
    { id: "sypark", name: "박신영", dept: "품질팀", title: "주임" },
    { id: "admin", name: "관리자", dept: "품질팀", title: "관리자" },
    { id: "quality1", name: "품질팀 담당자", dept: "품질팀", title: "사원" },
    { id: "prod1", name: "생산팀 담당자", dept: "생산팀", title: "사원" }
  ];
}

function openUserPickerModal(onSelect) {
  const existing = document.getElementById("user-picker-overlay");
  if (existing) {
    existing.remove();
  }

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay open";
  overlay.id = "user-picker-overlay";
  overlay.style.zIndex = "1100";

  overlay.innerHTML =
    '<div class="modal-box modal-box-wide">' +
    '<div class="modal-header"><h3>Users</h3><button class="modal-close-btn" id="user-picker-close-btn">✕</button></div>' +
    '<div class="modal-body">' +
    '<div class="vendor-picker-search">' +
    '<input type="text" id="user-picker-id" placeholder="ID">' +
    '<input type="text" id="user-picker-name" placeholder="이름">' +
    '<input type="text" id="user-picker-dept" placeholder="부서">' +
    '<button id="user-picker-search-btn">🔍 검색</button>' +
    "</div>" +
    '<div class="vendor-picker-table-wrapper">' +
    '<table class="vendor-picker-table">' +
    "<thead><tr><th>No</th><th>ID</th><th>이름</th><th>부서</th><th>직책</th></tr></thead>" +
    '<tbody id="user-picker-table-body"></tbody>' +
    "</table>" +
    "</div>" +
    "</div>" +
    "</div>";

  document.body.appendChild(overlay);

  function renderUsers(filter) {
    const tbody = document.getElementById("user-picker-table-body");
    const users = getUserPool().filter(function (user) {
      const idOk = !filter || !filter.id || user.id.toLowerCase().includes(filter.id);
      const nameOk = !filter || !filter.name || user.name.includes(filter.name);
      const deptOk = !filter || !filter.dept || user.dept.includes(filter.dept);
      return idOk && nameOk && deptOk;
    });

    tbody.innerHTML = "";
    users.forEach(function (user, index) {
      const row = document.createElement("tr");
      row.innerHTML =
        "<td>" + (index + 1) + "</td><td class='user-picker-id-cell'></td><td>" +
        user.name + "</td><td>" + user.dept + "</td><td>" + user.title + "</td>";

      const idCell = row.querySelector(".user-picker-id-cell");
      const link = document.createElement("a");
      link.href = "#";
      link.className = "id-link";
      link.textContent = user.id;
      link.addEventListener("click", function (event) {
        event.preventDefault();
        onSelect(user);
        overlay.remove();
      });
      idCell.appendChild(link);
      tbody.appendChild(row);
    });
  }

  renderUsers(null);

  const userPickerSearchBtn = document.getElementById("user-picker-search-btn");
  userPickerSearchBtn.addEventListener("click", function () {
    renderUsers({
      id: document.getElementById("user-picker-id").value.trim().toLowerCase(),
      name: document.getElementById("user-picker-name").value.trim(),
      dept: document.getElementById("user-picker-dept").value.trim()
    });
  });

  wireEnterToSearch(
    [
      document.getElementById("user-picker-id"),
      document.getElementById("user-picker-name"),
      document.getElementById("user-picker-dept")
    ],
    userPickerSearchBtn
  );

  document.getElementById("user-picker-close-btn").addEventListener("click", function () {
    overlay.remove();
  });

  overlay.addEventListener("click", function (event) {
    if (event.target === overlay) {
      overlay.remove();
    }
  });
}

// "검색추가" 모달: 기존에 등록된 A/I 항목 목록(AI List)에서 골라 지금 Audit에 연결(추가)함
const AI_POOL_KEY = "lims-ai-pool";

function getAiPool() {
  const saved = localStorage.getItem(AI_POOL_KEY);
  if (saved) {
    return JSON.parse(saved);
  }
  const seed = [
    { id: "AIL-0000004", content: "렘택" },
    { id: "AIL-0000003", content: "한솔" },
    { id: "AIL-0000002", content: "TEST" },
    { id: "AIL-0000001", content: "원재료 운송 온도 관리 방안 검토 후 회신" }
  ];
  localStorage.setItem(AI_POOL_KEY, JSON.stringify(seed));
  return seed;
}

function openAiSearchAddModal() {
  const bodyHtml =
    '<div class="vendor-picker-search">' +
    '<input type="text" id="ai-pool-id" placeholder="ID">' +
    '<input type="text" id="ai-pool-name" placeholder="명칭">' +
    '<button id="ai-pool-search-btn">🔍 검색</button>' +
    "</div>" +
    '<div class="vendor-picker-table-wrapper">' +
    '<table class="vendor-picker-table">' +
    "<thead><tr><th>No</th><th>S</th><th>ID</th><th>명칭</th></tr></thead>" +
    '<tbody id="ai-pool-table-body"></tbody>' +
    "</table>" +
    "</div>";

  openModal("AI List", bodyHtml, { wide: true });

  function renderPool(filter) {
    const tbody = document.getElementById("ai-pool-table-body");
    if (!tbody) {
      return;
    }
    const filtered = getAiPool().filter(function (item) {
      const idOk = !filter || !filter.id || item.id.toLowerCase().includes(filter.id);
      const nameOk = !filter || !filter.name || item.content.includes(filter.name);
      return idOk && nameOk;
    });

    tbody.innerHTML = "";
    filtered.forEach(function (item, index) {
      const row = document.createElement("tr");
      row.innerHTML = "<td>" + (index + 1) + "</td><td>👤</td><td class='ai-pool-id-cell'></td><td>" + item.content + "</td>";

      const idCell = row.querySelector(".ai-pool-id-cell");
      const link = document.createElement("a");
      link.href = "#";
      link.className = "id-link";
      link.textContent = item.id;
      link.addEventListener("click", function (event) {
        event.preventDefault();
        addAiRow({ status: "진행중", content: item.content, dept: "", due: "" });
        closeModal();
        refreshAiViewsAfterChange();
      });
      idCell.appendChild(link);
      tbody.appendChild(row);
    });
  }

  renderPool(null);

  const aiPoolSearchBtn = document.getElementById("ai-pool-search-btn");
  aiPoolSearchBtn.addEventListener("click", function () {
    renderPool({
      id: document.getElementById("ai-pool-id").value.trim().toLowerCase(),
      name: document.getElementById("ai-pool-name").value.trim()
    });
  });

  wireEnterToSearch(
    [document.getElementById("ai-pool-id"), document.getElementById("ai-pool-name")],
    aiPoolSearchBtn
  );
}

// 공급사 검색/선택 모달: 검색(ID/명칭) + 목록(페이지네이션) + 신규 등록. 행을 클릭하면 onSelect(vendor)가 호출되고 모달이 닫힘
function openVendorPickerModal(onSelect) {
  const bodyHtml =
    '<div class="vendor-picker-search">' +
    '<input type="text" id="vendor-picker-id" placeholder="ID">' +
    '<input type="text" id="vendor-picker-name" placeholder="명칭">' +
    '<button id="vendor-picker-search-btn">🔍 검색</button>' +
    '<button id="vendor-picker-add-btn">+ 추가</button>' +
    "</div>" +
    '<div class="vendor-picker-add-form" id="vendor-picker-add-form" style="display:none;">' +
    '<input type="text" id="vendor-picker-add-id" placeholder="ID">' +
    '<input type="text" id="vendor-picker-add-name" placeholder="명칭">' +
    '<button id="vendor-picker-add-save-btn">저장</button>' +
    '<button id="vendor-picker-add-cancel-btn">취소</button>' +
    "</div>" +
    '<div class="vendor-picker-table-wrapper">' +
    '<table class="vendor-picker-table">' +
    "<thead><tr><th>No</th><th>ID</th><th>명칭</th></tr></thead>" +
    '<tbody id="vendor-picker-table-body"></tbody>' +
    "</table>" +
    "</div>" +
    '<div class="vendor-picker-pagination">' +
    '<div class="page-left">' +
    '<div class="page-buttons">' +
    '<button id="vendor-picker-first-btn">|&lt;</button>' +
    '<button id="vendor-picker-prev-btn">&lt;</button>' +
    '<span class="page-number-list" id="vendor-picker-page-number-list"></span>' +
    '<button id="vendor-picker-next-btn">&gt;</button>' +
    '<button id="vendor-picker-last-btn">&gt;|</button>' +
    "</div>" +
    '<div class="page-size">' +
    '<select id="vendor-picker-page-size"><option>10</option><option selected>20</option><option>50</option><option>100</option></select>' +
    " items per page" +
    "</div>" +
    "</div>" +
    '<div class="page-total" id="vendor-picker-page-total"></div>' +
    "</div>";

  openModal("Vendor", bodyHtml, { wide: true });

  let pickerFilter = null;

  function getFilteredList() {
    const list = getVendorList();
    if (!pickerFilter) {
      return list;
    }
    return list.filter(function (vendor) {
      const idMatch = !pickerFilter.id || vendor.id.toLowerCase().includes(pickerFilter.id);
      const nameMatch = !pickerFilter.name || (vendor.customerName || "").includes(pickerFilter.name);
      return idMatch && nameMatch;
    });
  }

  function renderPickerTable() {
    const tbody = document.getElementById("vendor-picker-table-body");
    if (!tbody) {
      return;
    }

    const list = getFilteredList();
    tbody.innerHTML = "";

    list.forEach(function (vendor, index) {
      const row = document.createElement("tr");
      row.innerHTML = "<td>" + (index + 1) + "</td><td class='vendor-picker-id-cell'></td><td>" + vendor.customerName + "</td>";

      const idCell = row.querySelector(".vendor-picker-id-cell");
      const link = document.createElement("a");
      link.href = "#";
      link.className = "id-link";
      link.textContent = vendor.id;
      link.addEventListener("click", function (event) {
        event.preventDefault();
        onSelect(vendor);
        closeModal();
      });
      idCell.appendChild(link);

      tbody.appendChild(row);
    });

    if (pickerPaginator) {
      pickerPaginator.render();
    }
  }

  const pickerPaginator = setupPagination({
    getAllRows: function () {
      return Array.from(document.querySelectorAll("#vendor-picker-table-body tr"));
    },
    firstBtn: document.getElementById("vendor-picker-first-btn"),
    prevBtn: document.getElementById("vendor-picker-prev-btn"),
    nextBtn: document.getElementById("vendor-picker-next-btn"),
    lastBtn: document.getElementById("vendor-picker-last-btn"),
    pageNumberList: document.getElementById("vendor-picker-page-number-list"),
    pageSizeSelect: document.getElementById("vendor-picker-page-size"),
    pageTotalEl: document.getElementById("vendor-picker-page-total"),
    emptyText: "No items to display"
  });

  renderPickerTable();
  refreshVendorListFromServer(renderPickerTable);

  const vendorPickerSearchBtn = document.getElementById("vendor-picker-search-btn");
  vendorPickerSearchBtn.addEventListener("click", function () {
    pickerFilter = {
      id: document.getElementById("vendor-picker-id").value.trim().toLowerCase(),
      name: document.getElementById("vendor-picker-name").value.trim()
    };
    renderPickerTable();
  });

  wireEnterToSearch(
    [document.getElementById("vendor-picker-id"), document.getElementById("vendor-picker-name")],
    vendorPickerSearchBtn
  );

  const addForm = document.getElementById("vendor-picker-add-form");

  document.getElementById("vendor-picker-add-btn").addEventListener("click", function () {
    addForm.style.display = addForm.style.display === "none" ? "flex" : "none";
  });

  document.getElementById("vendor-picker-add-cancel-btn").addEventListener("click", function () {
    addForm.style.display = "none";
  });

  document.getElementById("vendor-picker-add-save-btn").addEventListener("click", function () {
    const idInput = document.getElementById("vendor-picker-add-id");
    const nameInput = document.getElementById("vendor-picker-add-name");
    const newId = idInput.value.trim();
    const newName = nameInput.value.trim();

    if (!newId || !newName) {
      alert("ID와 명칭을 입력해주세요.");
      return;
    }

    const list = getVendorList();
    const isDuplicate = list.some(function (vendor) {
      return vendor.id === newId;
    });
    if (isDuplicate) {
      alert("이미 존재하는 ID입니다.");
      return;
    }

    const newVendor = { id: newId, customerName: newName };
    list.push(newVendor);
    cacheVendorList(list);

    addForm.style.display = "none";
    idInput.value = "";
    nameInput.value = "";
    renderPickerTable();

    fetch(API_BASE + "/vendors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newVendor)
    }).catch(function (err) {
      console.error("공급사 서버 생성 실패 (로컬에는 저장됨):", err);
    });
  });
}

// 로그인 계정 정보 (이름/부서/이메일) — 정보수정에서 바꾸면 헤더 표시에도 실제로 반영됨
const PROFILE_KEY = "lims-profile";
const PROFILE_SEED = { name: "품질팀", dept: "품질팀", email: "" };

function getProfile() {
  const saved = localStorage.getItem(PROFILE_KEY);
  if (saved) {
    return JSON.parse(saved);
  }
  localStorage.setItem(PROFILE_KEY, JSON.stringify(PROFILE_SEED));
  return PROFILE_SEED;
}

function saveProfile(profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  renderProfileInfo();
}

// 헤더의 "이름 · 부서" 표시를 저장된 계정 정보로 채움 (모든 페이지 공통)
function renderProfileInfo() {
  const profile = getProfile();
  document.querySelectorAll(".user-info").forEach(function (el) {
    el.textContent = profile.name + " · " + profile.dept;
  });
}

renderProfileInfo();

// 프로필 드롭다운: 정보수정 / 비밀번호 변경 / 시스템 정보
document.querySelectorAll(".user-dropdown-menu .dropdown-link").forEach(function (link) {
  const label = link.textContent.trim();

  if (label.includes("정보수정")) {
    link.addEventListener("click", function (event) {
      event.preventDefault();
      const profile = getProfile();
      openModal(
        "정보수정",
        '<div class="modal-field"><label>이름</label><input type="text" id="profile-name-input" value="' + profile.name + '"></div>' +
        '<div class="modal-field"><label>부서</label><input type="text" id="profile-dept-input" value="' + profile.dept + '"></div>' +
        '<div class="modal-field"><label>이메일</label><input type="text" id="profile-email-input" placeholder="이메일 입력" value="' + profile.email + '"></div>' +
        '<div class="modal-actions"><button id="modal-save-btn">저장</button><button id="modal-cancel-btn">취소</button></div>'
      );
      document.getElementById("modal-cancel-btn").addEventListener("click", closeModal);
      document.getElementById("modal-save-btn").addEventListener("click", function () {
        const newName = document.getElementById("profile-name-input").value.trim();
        const newDept = document.getElementById("profile-dept-input").value.trim();
        const newEmail = document.getElementById("profile-email-input").value.trim();

        if (!newName || !newDept) {
          alert("이름과 부서를 입력해주세요.");
          return;
        }

        saveProfile({ name: newName, dept: newDept, email: newEmail });

        const auth = getAuth();
        if (auth) {
          fetch(API_BASE + "/auth/profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: auth.id, name: newName, dept: newDept })
          })
            .then(function () {
              auth.name = newName;
              auth.dept = newDept;
              localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
            })
            .catch(function (err) {
              console.error("계정 정보 서버 저장 실패 (화면에는 반영됨):", err);
            });
        }

        alert("정보가 저장되었습니다.");
        closeModal();
      });
    });
  } else if (label.includes("비밀번호 변경")) {
    link.addEventListener("click", function (event) {
      event.preventDefault();
      openModal(
        "비밀번호 변경",
        '<div class="modal-field"><label>현재 비밀번호</label><input type="password"></div>' +
        '<div class="modal-field"><label>새 비밀번호</label><input type="password"></div>' +
        '<div class="modal-field"><label>새 비밀번호 확인</label><input type="password"></div>' +
        '<div class="modal-actions"><button id="modal-save-btn">변경</button><button id="modal-cancel-btn">취소</button></div>'
      );
      document.getElementById("modal-cancel-btn").addEventListener("click", closeModal);
      document.getElementById("modal-save-btn").addEventListener("click", function () {
        const currentPw = document.querySelectorAll(".modal-field input[type=password]")[0].value;
        const newPw = document.querySelectorAll(".modal-field input[type=password]")[1].value;
        const confirmPw = document.querySelectorAll(".modal-field input[type=password]")[2].value;

        if (!newPw || newPw !== confirmPw) {
          alert("새 비밀번호가 일치하지 않습니다.");
          return;
        }

        const auth = getAuth();
        if (!auth) {
          alert("로그인 정보가 없습니다. 다시 로그인해주세요.");
          return;
        }

        fetch(API_BASE + "/auth/password", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: auth.id, currentPassword: currentPw, newPassword: newPw })
        })
          .then(function (res) {
            return res.json().then(function (data) {
              return { ok: res.ok, data: data };
            });
          })
          .then(function (result) {
            alert(result.data.message);
            if (result.ok) {
              closeModal();
            }
          })
          .catch(function () {
            alert("서버에 연결할 수 없습니다.");
          });
      });
    });
  } else if (label.includes("시스템 정보")) {
    link.addEventListener("click", function (event) {
      event.preventDefault();
      const currentProfile = getProfile();
      openModal(
        "시스템 정보",
        '<div class="modal-field-static">시스템명: 랩데이터통합관리 LIMS</div>' +
        '<div class="modal-field-static">버전: 1.0.0</div>' +
        '<div class="modal-field-static">접속 계정: ' + currentProfile.name + " · " + currentProfile.dept + "</div>" +
        '<div class="modal-actions"><button id="modal-cancel-btn">닫기</button></div>'
      );
      document.getElementById("modal-cancel-btn").addEventListener("click", closeModal);
    });
  } else if (label.includes("Logout")) {
    link.addEventListener("click", function (event) {
      event.preventDefault();
      logout();
    });
  }
});

// 로그아웃 처리: 확인 후 목록 화면으로 이동
function logout() {
  const confirmed = window.confirm("로그아웃 하시겠습니까?");
  if (confirmed) {
    localStorage.removeItem(AUTH_KEY);
    window.location.href = "login.html";
  }
}

// "로그아웃까지 95:52" 카운트다운: 실제로 매초 줄어들고, 0이 되면 자동 로그아웃
const logoutTimerEl = document.querySelector(".user-dropdown-menu .dropdown-item");

if (logoutTimerEl && logoutTimerEl.textContent.includes("로그아웃까지")) {
  const timeMatch = logoutTimerEl.textContent.match(/(\d+):(\d+)/);
  let logoutRemainingSeconds = timeMatch ? parseInt(timeMatch[1], 10) * 60 + parseInt(timeMatch[2], 10) : 0;

  function renderLogoutTimer() {
    const mm = Math.floor(logoutRemainingSeconds / 60);
    const ss = logoutRemainingSeconds % 60;
    logoutTimerEl.textContent = "🕐 로그아웃까지 " + String(mm).padStart(2, "0") + ":" + String(ss).padStart(2, "0");
  }

  const logoutIntervalId = setInterval(function () {
    logoutRemainingSeconds -= 1;

    if (logoutRemainingSeconds <= 0) {
      clearInterval(logoutIntervalId);
      logoutRemainingSeconds = 0;
      renderLogoutTimer();
      alert("세션이 만료되어 로그아웃됩니다.");
      localStorage.removeItem(AUTH_KEY);
      window.location.href = "login.html";
      return;
    }

    renderLogoutTimer();
  }, 1000);
}

// 헤더 OFF/ON 토글 버튼
document.querySelectorAll(".toggle-off").forEach(function (btn) {
  btn.addEventListener("click", function () {
    const isOn = btn.classList.toggle("on");
    btn.textContent = isOn ? "⏻ ON" : "⏻ OFF";
  });
});

// 검색창에서 Enter 치면 옆의 검색 버튼을 누른 것과 동일하게 동작 (모든 검색창 공용)
function wireEnterToSearch(inputs, btn) {
  if (!btn) {
    return;
  }
  inputs.forEach(function (input) {
    if (!input) {
      return;
    }
    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        btn.click();
      }
    });
  });
}

// 페이지네이션 공용 로직: 표 하나당 이 함수를 한 번 호출해서 페이지 넘기기 버튼/번호/총계를 관리
function setupPagination(options) {
  let currentPage = 1;

  function getPageSize() {
    return parseInt(options.pageSizeSelect.value, 10);
  }

  function render() {
    const allRows = options.getAllRows();
    const pageSize = getPageSize();
    const total = allRows.length;
    const totalPages = Math.max(Math.ceil(total / pageSize), 1);

    if (currentPage > totalPages) {
      currentPage = totalPages;
    }
    if (currentPage < 1) {
      currentPage = 1;
    }

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    allRows.forEach(function (row, index) {
      row.style.display = index >= startIndex && index < endIndex ? "" : "none";
    });

    options.pageNumberList.innerHTML = "";
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const btn = document.createElement("button");
      btn.textContent = String(pageNum);
      if (pageNum === currentPage) {
        btn.className = "page-active";
      }
      btn.addEventListener("click", function () {
        currentPage = pageNum;
        render();
      });
      options.pageNumberList.appendChild(btn);
    }

    options.firstBtn.disabled = currentPage === 1;
    options.prevBtn.disabled = currentPage === 1;
    options.nextBtn.disabled = currentPage === totalPages;
    options.lastBtn.disabled = currentPage === totalPages;

    if (options.pageTotalEl) {
      if (total === 0) {
        options.pageTotalEl.textContent = options.emptyText || "No items to display";
      } else {
        options.pageTotalEl.textContent = (startIndex + 1) + " - " + Math.min(endIndex, total) + " of " + total + " items";
      }
    }
  }

  options.firstBtn.addEventListener("click", function () {
    currentPage = 1;
    render();
  });
  options.prevBtn.addEventListener("click", function () {
    currentPage = Math.max(currentPage - 1, 1);
    render();
  });
  options.nextBtn.addEventListener("click", function () {
    currentPage = currentPage + 1;
    render();
  });
  options.lastBtn.addEventListener("click", function () {
    const total = options.getAllRows().length;
    currentPage = Math.max(Math.ceil(total / getPageSize()), 1);
    render();
  });
  options.pageSizeSelect.addEventListener("change", function () {
    currentPage = 1;
    render();
  });

  return { render: render };
}

// 사이드바 폭: 오른쪽 경계를 드래그해서 넓이 조절 (CSS 변수로 위쪽 타이틀 박스랑 폭을 공유)
const sidebarResizeHandle = document.getElementById("sidebar-resize-handle");
const sidebarLeft = document.querySelector(".sidebar-left");

if (sidebarResizeHandle && sidebarLeft) {
  let isDraggingSidebar = false;

  sidebarResizeHandle.addEventListener("mousedown", function (event) {
    isDraggingSidebar = true;
    sidebarResizeHandle.classList.add("dragging");
    event.preventDefault();
  });

  document.addEventListener("mousemove", function (event) {
    if (!isDraggingSidebar) {
      return;
    }
    const newWidth = event.clientX - sidebarLeft.getBoundingClientRect().left;
    const clampedWidth = Math.min(Math.max(newWidth, 180), 500);
    document.documentElement.style.setProperty("--sidebar-width", clampedWidth + "px");
  });

  document.addEventListener("mouseup", function () {
    if (isDraggingSidebar) {
      isDraggingSidebar = false;
      sidebarResizeHandle.classList.remove("dragging");
    }
  });
}

// Tree 정보 목록 높이: 연결정보 바로 위 경계를 드래그해서 조절
const sidebarVResizeHandle = document.getElementById("sidebar-vertical-resize-handle");
const treeItemList = document.getElementById("tree-item-list");

if (sidebarVResizeHandle && treeItemList) {
  let isDraggingV = false;

  sidebarVResizeHandle.addEventListener("mousedown", function (event) {
    isDraggingV = true;
    sidebarVResizeHandle.classList.add("dragging");
    event.preventDefault();
  });

  document.addEventListener("mousemove", function (event) {
    if (!isDraggingV) {
      return;
    }
    const newHeight = event.clientY - treeItemList.getBoundingClientRect().top;
    const clampedHeight = Math.min(Math.max(newHeight, 40), 500);
    treeItemList.style.height = clampedHeight + "px";
  });

  document.addEventListener("mouseup", function () {
    if (isDraggingV) {
      isDraggingV = false;
      sidebarVResizeHandle.classList.remove("dragging");
    }
  });
}

// 필터/정렬 드롭다운: 화살표 버튼 누르면 열리고, 다시 누르면 닫힘
const dropdownWraps = document.querySelectorAll(".dropdown-wrap");

dropdownWraps.forEach(function (wrap) {
  const caretBtn = wrap.querySelector(".caret-btn") || wrap.querySelector("button");

  caretBtn.addEventListener("click", function (event) {
    event.stopPropagation();
    const isOpen = wrap.classList.contains("open");

    dropdownWraps.forEach(function (otherWrap) {
      otherWrap.classList.remove("open");
    });

    if (!isOpen) {
      wrap.classList.add("open");
    }
  });
});

// 드롭다운 바깥을 누르면 전부 닫힘
document.addEventListener("click", function () {
  dropdownWraps.forEach(function (wrap) {
    wrap.classList.remove("open");
  });
});

// 수입검사/제품검사: 상태가 "진행중"인 항목 수를 헤더 🔔 배지에 반영
const INSPECTION_KEY_PREFIX = "lims-inspections-";
const INSPECTION_SEED = {
  incoming: [
    { name: "원재료 A 입고검사", status: "진행중", date: "2026.08.20" },
    { name: "원재료 B 입고검사", status: "완료", date: "2026.08.18" },
    { name: "원재료 C 입고검사", status: "진행중", date: "2026.08.22" }
  ],
  product: [
    { name: "완제품 X 출하검사", status: "진행중", date: "2026.08.21" },
    { name: "완제품 Y 출하검사", status: "대기", date: "2026.08.23" }
  ]
};

function getInspections(type) {
  const saved = localStorage.getItem(INSPECTION_KEY_PREFIX + type);
  if (saved) {
    return JSON.parse(saved);
  }
  const seed = INSPECTION_SEED[type] || [];
  localStorage.setItem(INSPECTION_KEY_PREFIX + type, JSON.stringify(seed));
  return seed;
}

function saveInspections(type, items) {
  localStorage.setItem(INSPECTION_KEY_PREFIX + type, JSON.stringify(items));
}

function countInProgress(type) {
  return getInspections(type).filter(function (item) {
    return item.status === "진행중";
  }).length;
}

function updateBellBadge() {
  const badge = document.querySelector(".badge.blue");
  if (!badge) {
    return;
  }
  badge.textContent = countInProgress("incoming") + countInProgress("product");
}

function renderInspectionTable(type) {
  const tbody = document.getElementById("inspection-table-body");
  if (!tbody) {
    return;
  }

  const items = getInspections(type);
  tbody.innerHTML = "";

  items.forEach(function (item, index) {
    const row = document.createElement("tr");
    row.innerHTML =
      "<td>" + (index + 1) + "</td>" +
      "<td>" + item.name + "</td>" +
      '<td class="status-cell"></td>' +
      "<td>" + item.date + "</td>";

    const select = document.createElement("select");
    ["진행중", "완료", "대기"].forEach(function (option) {
      const optionEl = document.createElement("option");
      optionEl.textContent = option;
      if (option === item.status) {
        optionEl.selected = true;
      }
      select.appendChild(optionEl);
    });

    select.addEventListener("change", function () {
      item.status = select.value;
      saveInspections(type, items);
      updateBellBadge();
    });

    row.querySelector(".status-cell").appendChild(select);
    tbody.appendChild(row);
  });
}

const inspectionType = document.body.dataset.inspectionType;
if (inspectionType) {
  renderInspectionTable(inspectionType);
}

updateBellBadge();

// 출하성적서: 상태가 "고객응답대기"인 항목 수를 헤더 📋 배지에 반영
const CERTIFICATE_KEY = "lims-certificates";
const CERTIFICATE_SEED = [
  { title: "260316 삼성파운드리 출하성적서", status: "고객응답대기", date: "2026.08.19" },
  { title: "260210 Nikka Finetech 출하성적서", status: "완료", date: "2026.08.15" },
  { title: "260318 렘택 출하성적서", status: "고객응답대기", date: "2026.08.23" }
];

function getCertificates() {
  const saved = localStorage.getItem(CERTIFICATE_KEY);
  if (saved) {
    return JSON.parse(saved);
  }
  localStorage.setItem(CERTIFICATE_KEY, JSON.stringify(CERTIFICATE_SEED));
  return CERTIFICATE_SEED;
}

function saveCertificates(items) {
  localStorage.setItem(CERTIFICATE_KEY, JSON.stringify(items));
}

function updateGreenBadge() {
  const badge = document.querySelector(".badge.green");
  if (!badge) {
    return;
  }
  const total = getCertificates().filter(function (item) {
    return item.status === "고객응답대기";
  }).length;
  badge.textContent = total;
}

function renderCertificateTable() {
  const tbody = document.getElementById("certificate-table-body");
  if (!tbody) {
    return;
  }

  const items = getCertificates();
  tbody.innerHTML = "";

  items.forEach(function (item, index) {
    const row = document.createElement("tr");
    row.innerHTML =
      "<td>" + (index + 1) + "</td>" +
      "<td>" + item.title + "</td>" +
      '<td class="status-cell"></td>' +
      "<td>" + item.date + "</td>";

    const select = document.createElement("select");
    ["고객응답대기", "완료"].forEach(function (option) {
      const optionEl = document.createElement("option");
      optionEl.textContent = option;
      if (option === item.status) {
        optionEl.selected = true;
      }
      select.appendChild(optionEl);
    });

    select.addEventListener("change", function () {
      item.status = select.value;
      saveCertificates(items);
      updateGreenBadge();
    });

    row.querySelector(".status-cell").appendChild(select);
    tbody.appendChild(row);
  });
}

renderCertificateTable();
updateGreenBadge();

// 상단 nav 메뉴: 클릭하면 카테고리별 링크가 담긴 큰 메뉴가 아래 펼쳐짐
const NAV_MEGA_CONTENT = {
  "시험관리": [
    [
      { icon: "📄", heading: "시험", links: ["수입검사", "공정검사", "제품검사", "이력확인"] },
      { icon: "📄", heading: "성적서", links: ["출하성적서"] }
    ],
    [
      { icon: "🔍", heading: "제품정보", links: ["제품", "원료"] }
    ]
  ],
  "품질보증": [
    [
      { icon: "📄", heading: "부적합관리", links: ["원료부적합대책서", "제품부적합대책서"] },
      { icon: "🖥️", heading: "Audit관리", links: ["공급사 Audit", "고객사 Audit"] }
    ],
    [
      { icon: "✉️", heading: "고객관리", links: ["PCN관리", "고객요청관리", "고객불만관리", "변경관리"] }
    ],
    [
      { icon: "📊", heading: "SPC관리", links: ["SPC(종합)", "SPC(관리도)", "SPC(공정능력)"] },
      { icon: "✉️", heading: "내부심사", links: ["내부심사"] }
    ]
  ],
  "자원관리": [
    [
      { icon: "🧪", heading: "시약/소모품 관리", links: ["시약 관리", "소모품 관리"] },
      { icon: "🔗", heading: "문서관리", links: ["기술문서", "규격문서"] }
    ],
    [
      { icon: "🗄️", heading: "장비관리", links: ["장비관리", "점검이력", "분석실PM점검"] },
      { icon: "📋", heading: "LTL", links: ["원료LTL", "사업장LTL"] }
    ]
  ],
  "현황": [
    [
      { icon: "📊", heading: "등록현황", links: ["문서", "시험"] }
    ],
    [
      { icon: "📋", heading: "일분포현황", links: ["문서-기술문서", "문서-규격문서", "시험성적서", "시험의뢰서"] }
    ]
  ]
};

const navMegaMenu = document.getElementById("nav-mega-menu");
const navLinks = document.querySelectorAll("nav a");

function renderNavMegaMenu(navLabel) {
  const columns = NAV_MEGA_CONTENT[navLabel];
  if (!navMegaMenu || !columns) {
    return;
  }

  navMegaMenu.innerHTML = "";

  const titleEl = document.createElement("div");
  titleEl.className = "nav-mega-title";
  titleEl.textContent = navLabel;
  navMegaMenu.appendChild(titleEl);

  const columnsWrap = document.createElement("div");
  columnsWrap.className = "nav-mega-columns";

  columns.forEach(function (groups) {
    const columnEl = document.createElement("div");
    columnEl.className = "nav-mega-column";

    groups.forEach(function (group) {
      const heading = document.createElement("h4");
      heading.textContent = (group.icon ? group.icon + " " : "") + group.heading;
      columnEl.appendChild(heading);

      group.links.forEach(function (linkText) {
        const link = document.createElement("a");
        link.href = "#";
        link.textContent = linkText;
        columnEl.appendChild(link);
      });
    });

    columnsWrap.appendChild(columnEl);
  });

  navMegaMenu.appendChild(columnsWrap);
}

function closeNavMegaMenu() {
  if (navMegaMenu) {
    navMegaMenu.classList.remove("open");
  }
  navLinks.forEach(function (link) {
    link.classList.remove("nav-active");
  });
}

navLinks.forEach(function (link) {
  link.addEventListener("click", function (event) {
    event.preventDefault();
    const alreadyOpen = link.classList.contains("nav-active") && navMegaMenu.classList.contains("open");

    closeNavMegaMenu();

    if (!alreadyOpen) {
      renderNavMegaMenu(link.textContent.trim());
      link.classList.add("nav-active");
      navMegaMenu.classList.add("open");
    }
  });
});

document.addEventListener("click", function (event) {
  if (navMegaMenu && navMegaMenu.classList.contains("open")) {
    if (!navMegaMenu.contains(event.target) && !event.target.closest("nav")) {
      closeNavMegaMenu();
    }
  }
});

// 필터 드롭다운 항목: 누를 때마다 그 항목만 체크 온오프 (여러 개 동시 체크 가능)
const filterWrap = document.getElementById("filter-wrap");

if (filterWrap) {
  const filterItems = filterWrap.querySelectorAll(".dropdown-item");

  filterItems.forEach(function (item) {
    item.addEventListener("click", function (event) {
      event.stopPropagation();

      const isChecked = item.textContent.startsWith("✔ ");
      const label = item.textContent.replace("✔ ", "");
      item.textContent = isChecked ? label : "✔ " + label;
    });
  });
}

// 정렬: 아이콘을 눌러도, 목록 항목을 직접 눌러도 그 항목으로 체크가 옮겨감
const sortIconBtn = document.getElementById("sort-icon-btn");
const sortMenuItems = document.querySelectorAll("#sort-dropdown-menu .dropdown-item");

function selectSortOption(label) {
  sortMenuItems.forEach(function (item) {
    const itemLabel = item.textContent.replace("✔ ", "").trim();
    item.textContent = itemLabel === label ? "✔ " + itemLabel : itemLabel;
  });

  if (sortIconBtn) {
    if (label === "최신순") {
      sortIconBtn.textContent = "🔽";
    } else if (label === "오래된순") {
      sortIconBtn.textContent = "🔼";
    }
  }
}

if (sortIconBtn) {
  sortIconBtn.addEventListener("click", function (event) {
    event.stopPropagation();
    const isAscending = sortIconBtn.textContent === "🔼";
    selectSortOption(isAscending ? "최신순" : "오래된순");
  });
}

sortMenuItems.forEach(function (item) {
  item.addEventListener("click", function (event) {
    event.stopPropagation();
    const label = item.textContent.replace("✔ ", "").trim();
    selectSortOption(label);
  });
});

// 수정 버튼을 누르면 편집 모드 켜고 끄기 (일반 텍스트 필드도 같이 입력 가능하게)
const editToggleBtn = document.getElementById("edit-toggle-btn");
const infoTable = document.querySelector(".info-table");
const FIELD_OPTIONS = {
  status: ["진행중", "완료", "대기"],
  country: ["-2147483647", "대한민국", "일본", "중국", "미국"]
};

function enterFieldEditMode() {
  const displays = document.querySelectorAll(".field-display");

  displays.forEach(function (span) {
    const optionList = FIELD_OPTIONS[span.dataset.fieldType];
    const currentValue = span.textContent;
    const parent = span.parentElement;

    if (optionList) {
      const select = document.createElement("select");
      select.className = "field-input";
      select.id = span.id;
      select.dataset.fieldType = span.dataset.fieldType;
      optionList.forEach(function (option) {
        const optionEl = document.createElement("option");
        optionEl.textContent = option;
        if (option === currentValue) {
          optionEl.selected = true;
        }
        select.appendChild(optionEl);
      });
      parent.replaceChild(select, span);
    } else {
      const input = document.createElement("input");
      input.type = "text";
      input.className = "field-input";
      input.id = span.id;
      input.value = currentValue;
      if (span.dataset.fieldRequired) {
        input.dataset.fieldRequired = span.dataset.fieldRequired;
      }
      if (span.dataset.fieldReadonly) {
        input.dataset.fieldReadonly = span.dataset.fieldReadonly;
        input.disabled = true;
      }
      parent.replaceChild(input, span);
    }
  });
}

function exitFieldEditMode() {
  const fields = document.querySelectorAll(".field-input");

  fields.forEach(function (fieldEl) {
    const span = document.createElement("span");
    span.className = "field-display";
    span.id = fieldEl.id;
    if (fieldEl.tagName === "SELECT") {
      span.dataset.fieldType = fieldEl.dataset.fieldType;
    }
    if (fieldEl.dataset.fieldRequired) {
      span.dataset.fieldRequired = fieldEl.dataset.fieldRequired;
    }
    if (fieldEl.dataset.fieldReadonly) {
      span.dataset.fieldReadonly = fieldEl.dataset.fieldReadonly;
    }
    span.textContent = fieldEl.value;
    fieldEl.parentElement.replaceChild(span, fieldEl);
  });
}

const remarkTextarea = document.querySelector(".remark-textarea");

if (editToggleBtn && infoTable) {
  editToggleBtn.addEventListener("click", function () {
    const turningOn = !infoTable.classList.contains("edit-mode");

    if (!turningOn) {
      const requiredFields = document.querySelectorAll('.field-input[data-field-required="true"]');
      const hasEmpty = Array.from(requiredFields).some(function (field) {
        return field.value.trim() === "";
      });
      if (hasEmpty) {
        alert("필수 입력 항목을 입력해주세요.");
        return;
      }
    }

    infoTable.classList.toggle("edit-mode");

    if (turningOn) {
      enterFieldEditMode();
      editToggleBtn.textContent = "💾 저장";
    } else {
      exitFieldEditMode();
      editToggleBtn.textContent = "✏️ 수정";

      // 지금 보고 있는 게 Audit 레코드면, 화면에서 고친 값을 실제 데이터에도 저장
      if (currentDetailRecordId && typeof getAudits === "function") {
        const items = getAudits();
        const record = items.find(function (item) {
          return item.id === currentDetailRecordId;
        });

        if (record) {
          const idField = document.getElementById("detail-id-field");
          const statusField = document.getElementById("detail-status-field");
          const titleField = document.getElementById("detail-title-field");
          const supplierField = document.getElementById("detail-supplier-field");
          const evalDateField = document.getElementById("detail-evaldate-field");
          const visitDateField = document.getElementById("detail-visitdate-field");
          const resultField = document.getElementById("detail-result-field");
          const resultSummaryField = document.getElementById("detail-resultsummary-field");

          const newId = idField ? idField.textContent.trim() : record.id;

          record.status = statusField ? statusField.textContent.trim() : record.status;
          record.title = titleField ? titleField.textContent.trim() : record.title;
          record.evalDate = evalDateField ? evalDateField.textContent.trim() : record.evalDate;
          record.visitDate = visitDateField ? visitDateField.textContent.trim() : record.visitDate;
          record.result = resultField ? resultField.textContent.trim() : record.result;
          record.resultSummary = resultSummaryField ? resultSummaryField.textContent.trim() : record.resultSummary;
          record.tabLabel = record.title;

          record.supplier = supplierField ? supplierField.textContent.trim() : record.supplier;

          if (newId && newId !== record.id) {
            record.id = newId;
            record.detailUrl = "detail.html?id=" + encodeURIComponent(newId);
            currentDetailRecordId = newId;
          }

          saveAudits(items);
          document.body.dataset.tabLabel = record.tabLabel;

          fetch(API_BASE + "/audits/" + encodeURIComponent(record.id), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(toBackendAudit(record))
          }).catch(function (err) {
            console.error("Audit 서버 저장 실패 (로컬에는 저장됨):", err);
          });
        }
      }

      // 지금 보고 있는 게 공급사 상세면, 고친 값을 저장 (공급사는 하나뿐이라 모든 Audit이 이 값을 공유해서 봄)
      if (document.body.dataset.pageType === "vendor" && typeof getVendor === "function") {
        const vendor = getCurrentVendorRecord();
        const idField = document.getElementById("vendor-id-field");
        const nameField = document.getElementById("vendor-name-field");

        const newId = idField ? idField.textContent.trim() : vendor.id;
        const newName = nameField ? nameField.textContent.trim() : vendor.customerName;

        vendor.id = newId;
        vendor.customerName = newName;
        saveVendorRecord(vendor);

        document.body.dataset.tabLabel = newName;

        if (typeof getOpenTabs === "function") {
          const tabs = getOpenTabs();
          const currentUrl = getCurrentUrl();
          const thisTab = tabs.find(function (tab) {
            return tab.url === currentUrl;
          });
          if (thisTab) {
            thisTab.label = newName;
            saveOpenTabs(tabs);
            renderTabBar();
          }
        }
      }
    }

    if (remarkTextarea) {
      remarkTextarea.disabled = !turningOn;
    }
  });
}

// 날짜 아이콘: 편집 모드일 때만 눌러서 날짜를 고를 수 있음
const dateIconButtons = document.querySelectorAll(".date-icon-btn");

dateIconButtons.forEach(function (btn) {
  btn.addEventListener("click", function () {
    if (!infoTable || !infoTable.classList.contains("edit-mode")) {
      return;
    }

    const cell = btn.parentElement;
    const display = cell.querySelector(".date-display");

    const dateInput = document.createElement("input");
    dateInput.type = "date";
    dateInput.className = "date-picker-input";

    cell.replaceChild(dateInput, display);

    if (dateInput.showPicker) {
      dateInput.showPicker();
    } else {
      dateInput.focus();
    }

    dateInput.addEventListener("change", function () {
      const newDisplay = document.createElement("span");
      newDisplay.className = "date-display";
      newDisplay.textContent = dateInput.value.replaceAll("-", ".");
      cell.replaceChild(newDisplay, dateInput);
    });
  });
});

// 첨부파일: 파일 선택하면 표에 행 추가, 🗑️ 삭제로 그 행 지우기
const fileUploadInput = document.getElementById("file-upload-input");
const fileTableBody = document.getElementById("file-table-body");

function todayAsDisplayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return year + "." + month + "." + day;
}

let filePaginator = null;

if (fileTableBody) {
  filePaginator = setupPagination({
    getAllRows: function () {
      return Array.from(fileTableBody.querySelectorAll("tr:not(.empty-row)"));
    },
    firstBtn: document.getElementById("file-first-btn"),
    prevBtn: document.getElementById("file-prev-btn"),
    nextBtn: document.getElementById("file-next-btn"),
    lastBtn: document.getElementById("file-last-btn"),
    pageNumberList: document.getElementById("file-page-number-list"),
    pageSizeSelect: document.getElementById("file-page-size"),
    pageTotalEl: document.getElementById("file-page-total"),
    emptyText: "No items to display"
  });
}

function updateFileTableState() {
  const rows = fileTableBody.querySelectorAll("tr:not(.empty-row)");
  const total = rows.length;

  const emptyRow = document.getElementById("file-empty-row");
  if (total === 0 && !emptyRow) {
    const row = document.createElement("tr");
    row.className = "empty-row";
    row.id = "file-empty-row";
    fileTableBody.appendChild(row);
  } else if (total > 0 && emptyRow) {
    emptyRow.remove();
  }

  if (filePaginator) {
    filePaginator.render();
  }
}

function addFileRow(fileName) {
  const emptyRow = document.getElementById("file-empty-row");
  if (emptyRow) {
    emptyRow.remove();
  }

  const row = document.createElement("tr");
  row.innerHTML =
    "<td><button>🗑️ 삭제</button></td>" +
    "<td>" + fileName + "</td>" +
    "<td>품질팀</td>" +
    "<td>" + todayAsDisplayDate() + "</td>";

  const deleteBtn = row.querySelector("button");
  deleteBtn.addEventListener("click", function () {
    row.remove();
    updateFileTableState();
  });

  fileTableBody.appendChild(row);
  updateFileTableState();
}

if (filePaginator) {
  filePaginator.render();
}

if (fileUploadInput) {
  fileUploadInput.addEventListener("change", function () {
    Array.from(fileUploadInput.files).forEach(function (file) {
      addFileRow(file.name);
    });
    fileUploadInput.value = "";
  });
}

// 첨부파일: 끌어다 놓기(drag & drop)
const uploadArea = document.querySelector(".upload-area");

if (uploadArea) {
  uploadArea.addEventListener("dragover", function (event) {
    event.preventDefault();
    uploadArea.classList.add("drag-over");
  });

  uploadArea.addEventListener("dragleave", function () {
    uploadArea.classList.remove("drag-over");
  });

  uploadArea.addEventListener("drop", function (event) {
    event.preventDefault();
    uploadArea.classList.remove("drag-over");

    Array.from(event.dataTransfer.files).forEach(function (file) {
      addFileRow(file.name);
    });
  });
}

// A/I List: ➕ 추가로 새 행 만들고, 🗑️ 연결삭제로 그 행 지우기
const aiTableBody = document.getElementById("ai-table-body");
const aiAddBtn = document.getElementById("ai-add-btn");

let aiPaginator = null;

if (aiTableBody) {
  aiPaginator = setupPagination({
    getAllRows: function () {
      return Array.from(aiTableBody.querySelectorAll("tr:not(.filtered-out)"));
    },
    firstBtn: document.getElementById("ai-first-btn"),
    prevBtn: document.getElementById("ai-prev-btn"),
    nextBtn: document.getElementById("ai-next-btn"),
    lastBtn: document.getElementById("ai-last-btn"),
    pageNumberList: document.getElementById("ai-page-number-list"),
    pageSizeSelect: document.getElementById("ai-page-size"),
    pageTotalEl: document.getElementById("ai-page-total"),
    emptyText: "No items to display"
  });
}

// A/I List 검색: 상태/부서담당/내용/기한 조건에 맞는 행만 남기고 나머지는 숨김
const aiSearchBtn = document.getElementById("ai-search-btn");

function applyAiFilter() {
  if (!aiTableBody) {
    return;
  }

  const statusEl = document.getElementById("ai-filter-status");
  const deptEl = document.getElementById("ai-filter-dept");
  const contentEl = document.getElementById("ai-filter-content");
  const dueEl = document.getElementById("ai-filter-due");

  const statusValue = statusEl ? statusEl.value : "전체";
  const deptValue = deptEl ? deptEl.value.trim() : "";
  const contentValue = contentEl ? contentEl.value.trim() : "";
  const dueValue = dueEl ? dueEl.value.trim() : "";

  aiTableBody.querySelectorAll("tr").forEach(function (row) {
    const cells = row.children;
    const rowStatus = cells[3] ? cells[3].textContent.trim() : "";
    const rowContent = cells[4] ? cells[4].textContent.trim() : "";
    const rowDept = cells[5] ? cells[5].textContent.trim() : "";
    const rowDue = cells[6] ? cells[6].textContent.trim() : "";

    const isMatch =
      (statusValue === "전체" || rowStatus === statusValue) &&
      (deptValue === "" || rowDept.includes(deptValue)) &&
      (contentValue === "" || rowContent.includes(contentValue)) &&
      (dueValue === "" || rowDue.includes(dueValue));

    row.classList.toggle("filtered-out", !isMatch);
  });

  if (aiPaginator) {
    aiPaginator.render();
  }
}

if (aiSearchBtn) {
  aiSearchBtn.addEventListener("click", applyAiFilter);

  wireEnterToSearch(
    [
      document.getElementById("ai-filter-dept"),
      document.getElementById("ai-filter-content"),
      document.getElementById("ai-filter-due")
    ],
    aiSearchBtn
  );
}

function renumberAiRows() {
  const rows = aiTableBody.querySelectorAll("tr");

  rows.forEach(function (row, index) {
    const noCell = row.children[2];
    noCell.textContent = index + 1;
  });

  if (aiPaginator) {
    aiPaginator.render();
  }
}

// A/I List 입력칸: 포커스를 벗어나면 텍스트로 확정(저장)되고, 더블클릭하면 다시 수정 가능
function formatIsoDateForDisplay(isoDate) {
  return isoDate ? isoDate.replaceAll("-", ".") : "";
}

// 일반 텍스트/상태/기한 칸: 더블클릭하면 입력 가능하게, 포커스를 벗어나면 다시 텍스트로
const AI_STATUS_OPTIONS = ["진행중", "완료", "대기"];

function wireAiCellDisplay(span) {
  span.title = "더블클릭하면 수정할 수 있어요";

  span.addEventListener("dblclick", function () {
    if (span.dataset.cellType === "date") {
      const widget = createAiDateEditWidget(span.textContent);
      span.parentElement.replaceChild(widget, span);
      widget.querySelector(".ai-cell-input").focus();
      return;
    }

    if (span.dataset.cellType === "status") {
      const select = document.createElement("select");
      select.className = "ai-cell-input";
      select.dataset.cellType = "status";

      AI_STATUS_OPTIONS.forEach(function (option) {
        const optionEl = document.createElement("option");
        optionEl.textContent = option;
        if (option === span.textContent) {
          optionEl.selected = true;
        }
        select.appendChild(optionEl);
      });

      span.parentElement.replaceChild(select, span);
      select.focus();
      makeAiCellEditable(select);
      return;
    }

    const newInput = document.createElement("input");
    newInput.type = "text";
    newInput.className = "ai-cell-input";
    newInput.value = span.textContent;

    span.parentElement.replaceChild(newInput, span);
    newInput.focus();
    makeAiCellEditable(newInput);
  });
}

function makeAiCellEditable(input) {
  input.addEventListener("blur", function () {
    const span = document.createElement("span");
    span.className = "ai-cell-display";
    if (input.dataset.cellType) {
      span.dataset.cellType = input.dataset.cellType;
    }
    span.textContent = input.value;

    input.parentElement.replaceChild(span, input);
    wireAiCellDisplay(span);
  });
}

// 기한 칸: 텍스트 입력 + 오른쪽 📅 아이콘. 아이콘 누르면 숨겨진 달력이 열리고,
// 고른 날짜가 텍스트칸에 채워짐. 텍스트칸에 직접 타이핑도 가능.
function createAiDateEditWidget(initialText) {
  const wrapper = document.createElement("div");
  wrapper.className = "date-input ai-date-input";

  const textInput = document.createElement("input");
  textInput.type = "text";
  textInput.className = "ai-cell-input";
  textInput.value = initialText;

  const iconBtn = document.createElement("button");
  iconBtn.type = "button";
  iconBtn.className = "icon-btn";
  iconBtn.textContent = "📅";

  const hiddenDateInput = document.createElement("input");
  hiddenDateInput.type = "date";
  hiddenDateInput.className = "ai-hidden-date-input";

  wrapper.appendChild(textInput);
  wrapper.appendChild(iconBtn);
  wrapper.appendChild(hiddenDateInput);

  function commit() {
    const span = document.createElement("span");
    span.className = "ai-cell-display";
    span.dataset.cellType = "date";
    span.textContent = textInput.value;

    wrapper.parentElement.replaceChild(span, wrapper);
    wireAiCellDisplay(span);
  }

  textInput.addEventListener("blur", function (event) {
    if (wrapper.contains(event.relatedTarget)) {
      return;
    }
    commit();
  });

  iconBtn.addEventListener("click", function () {
    if (hiddenDateInput.showPicker) {
      hiddenDateInput.showPicker();
    } else {
      hiddenDateInput.focus();
    }
  });

  hiddenDateInput.addEventListener("change", function () {
    textInput.value = formatIsoDateForDisplay(hiddenDateInput.value);
    commit();
  });

  return wrapper;
}

// 기존 행의 기한 칸(빈 칸)도 더블클릭으로 날짜 입력 가능하게 등록
document.querySelectorAll(".ai-cell-display").forEach(function (span) {
  wireAiCellDisplay(span);
});

function wireAiDeleteButton(row) {
  const deleteBtn = row.children[1].querySelector("button");
  deleteBtn.addEventListener("click", function () {
    row.remove();
    renumberAiRows();
  });
}

// A/I 행의 표시용 ID (AIL-XXXXXXX). 3번부터 시작 — 원본 화면의 한솔/렘택 예시(AIL-0000003/4)와 맞춤
function computeAilId(index) {
  return "AIL-" + String(index + 3).padStart(7, "0");
}

// "View"(➕) 버튼: 이 A/I 항목의 상세정보를 플로팅 창으로 보여줌
function wireAiViewButton(row) {
  const viewBtn = row.querySelector(".ai-view-btn");
  if (!viewBtn) {
    return;
  }
  viewBtn.addEventListener("click", function () {
    const index = Array.from(aiTableBody.children).indexOf(row);
    openAiItemCard(computeAilId(index), row);
  });
}

// A/I 항목 하나의 상세정보를 보여주는 플로팅 창 (상세정보/담당자/상위구성/하위구성 전환 + 수정/삭제 가능)
function openAiItemCard(ailId, sourceRow) {
  const existing = document.getElementById("floating-ai-item-card");
  if (existing) {
    existing.remove();
  }

  function readSource() {
    return {
      status: sourceRow.children[3] ? sourceRow.children[3].textContent.trim() : "",
      content: sourceRow.children[4] ? sourceRow.children[4].textContent.trim() : "",
      dept: sourceRow.children[5] ? sourceRow.children[5].textContent.trim() : "",
      due: sourceRow.children[6] ? sourceRow.children[6].textContent.trim() : ""
    };
  }

  function setCellText(cell, text) {
    const span = cell.querySelector(".ai-cell-display");
    if (span) {
      span.textContent = text;
    } else {
      cell.textContent = text;
    }
  }

  function esc(text) {
    return text.replace(/"/g, "&quot;");
  }

  const emptyTableHtml = function (headers) {
    return (
      '<div class="ai-item-table-wrapper">' +
      '<table class="ai-table"><thead><tr>' +
      headers.map(function (h) { return "<th>" + h + "</th>"; }).join("") +
      "</tr></thead><tbody></tbody></table>" +
      "</div>" +
      '<div class="page-total">No items to display</div>'
    );
  };

  function buildDetailViewHtml(values) {
    return (
      '<div class="info-block">' +
      '<div class="info-block-header"><h3 class="section-title">일반정보</h3><span class="required-note">* 필수 입력</span></div>' +
      '<table class="info-table">' +
      '<tr><th><span class="required-mark">*</span>ID</th><td>' + ailId + '</td><th>상태</th>' +
      '<td><select class="field-input" id="ai-item-status" disabled>' +
      ["진행중", "완료", "대기"].map(function (opt) {
        return "<option" + (values.status === opt ? " selected" : "") + ">" + opt + "</option>";
      }).join("") +
      "</select></td></tr>" +
      '<tr><th>내용</th><td><input type="text" class="field-input" id="ai-item-content" value="' + esc(values.content) + '" disabled></td>' +
      '<th>기한</th><td><div class="date-input"><input type="text" id="ai-item-due" value="' + esc(values.due) + '" disabled><button id="ai-item-due-btn" disabled>📅</button></div></td></tr>' +
      '<tr><th>부서/담당</th><td><div class="input-with-icon"><input type="text" class="field-input" id="ai-item-dept" value="' + esc(values.dept) + '" disabled>' +
      '<button class="supplier-pick-btn" id="ai-item-dept-search-btn" title="담당자 검색" disabled>🔍</button></div></td>' +
      '<th>알림 기준</th><td><input type="text" class="field-input" id="ai-item-alert" disabled></td></tr>' +
      "</table>" +
      "</div>" +
      '<div class="info-block">' +
      '<h3 class="section-title">담당자</h3>' +
      '<div class="ai-search-bar">' +
      '<span class="ai-label">담당자</span>' +
      '<input type="text" id="ai-item-assignee-search-input">' +
      '<button id="ai-item-assignee-search-btn">🔍 검색</button>' +
      '<button id="ai-item-assignee-add-btn">➕ 추가</button>' +
      '<button id="ai-item-assignee-refresh-btn">🔄 새로고침</button>' +
      "</div>" +
      emptyTableHtml(["No", "ID", "담당자", "부서"]) +
      "</div>" +
      '<div class="info-block">' +
      "<h3>📁 파일정보</h3>" +
      '<div class="upload-area"><label class="upload-btn">파일선택<input type="file" hidden></label><span class="upload-hint">파일을 여기에 끌어다 놓으세요.</span></div>' +
      "</div>" +
      '<div class="info-block">' +
      '<h3 class="section-title">시스템정보</h3>' +
      '<div class="sys-info-row">' +
      '<div class="sys-info-item"><span class="sys-label">생성자</span><div class="sys-input">박신영<span class="sys-search-icon">🔍</span></div></div>' +
      '<div class="sys-info-item"><span class="sys-label">수정자</span><div class="sys-input"><span class="sys-search-icon">🔍</span></div></div>' +
      "</div>" +
      "</div>"
    );
  }

  const otherViews = {
    assignee: { title: "담당자", html: emptyTableHtml(["N", "Login", "이름", "부서", "전화", "FAX", "이메일", "비고"]) },
    parent: { title: "상위구성", html: emptyTableHtml(["N", "C", "S", "Action", "ID", "Revision", "제목", "작성자", "생성일"]) },
    child: { title: "하위구성", html: emptyTableHtml(["N", "Action", "C", "S", "ID", "리비전", "제목", "생성자", "생성일"]) }
  };

  const card = document.createElement("div");
  card.className = "floating-card ai-item-card";
  card.id = "floating-ai-item-card";
  card.innerHTML =
    '<div class="floating-card-titlebar">' +
    '<span id="ai-item-card-title">' + readSource().content + "</span>" +
    "<div>" +
    '<button class="floating-card-maximize-btn" title="크게 보기">⛶</button>' +
    '<button class="floating-card-close-btn" title="닫기">✕</button>' +
    "</div>" +
    "</div>" +
    '<div class="ai-item-toolbar section-header" id="ai-item-toolbar">' +
    '<span id="ai-item-toolbar-title">ℹ️ 상세정보</span>' +
    '<div class="detail-actions">' +
    '<button id="ai-item-edit-btn">✏️ 수정</button>' +
    '<button id="ai-item-delete-btn">🗑️ 삭제</button>' +
    '<button id="ai-item-refresh-btn">🔄 새로고침</button>' +
    "</div>" +
    "</div>" +
    '<div class="ai-item-layout">' +
    '<aside class="ai-item-sidebar">' +
    '<div class="sidebar-section-header"><h4>Tree 정보</h4>' +
    '<div class="sidebar-section-actions">' +
    '<button class="tree-icon-btn" title="필터">🔽</button>' +
    '<button class="tree-icon-btn" title="정렬">🔼</button>' +
    '<button class="tree-icon-btn" title="새로고침">🔄</button>' +
    "</div>" +
    "</div>" +
    '<div class="tree-item-list"><div class="tree-item" id="ai-item-tree-item">' + readSource().content + " " + ailId + " A</div></div>" +
    '<div class="sidebar-section-header"><h4>연결정보</h4></div>' +
    '<ul class="link-list" id="ai-item-link-list">' +
    '<li class="link-active" data-view="detail">상세정보</li>' +
    '<li data-view="assignee">담당자</li>' +
    '<li data-view="parent">상위구성</li>' +
    '<li data-view="child">하위구성</li>' +
    "</ul>" +
    "</aside>" +
    '<main class="ai-item-main" id="ai-item-main"></main>' +
    "</div>";

  document.body.appendChild(card);

  const mainEl = document.getElementById("ai-item-main");
  const toolbarTitleEl = document.getElementById("ai-item-toolbar-title");
  const editBtn = document.getElementById("ai-item-edit-btn");
  const deleteBtn = document.getElementById("ai-item-delete-btn");
  const refreshBtn = document.getElementById("ai-item-refresh-btn");

  let currentView = "detail";
  let editing = false;

  const FIELD_IDS = ["ai-item-status", "ai-item-content", "ai-item-due", "ai-item-due-btn", "ai-item-dept", "ai-item-dept-search-btn", "ai-item-alert"];

  function wireDetailFieldEvents() {
    const deptSearchBtn = document.getElementById("ai-item-dept-search-btn");
    deptSearchBtn.addEventListener("click", function () {
      if (deptSearchBtn.disabled) {
        return;
      }
      openUserPickerModal(function (user) {
        document.getElementById("ai-item-dept").value = user.dept + " " + user.name;
      });
    });
    setupSimpleDateField("ai-item-due", "ai-item-due-btn");

    // 담당자 섹션의 "+ 추가": Users에서 골라 담당자 목록에 행 추가
    const assigneeAddBtn = document.getElementById("ai-item-assignee-add-btn");
    const assigneeSearchBtn = document.getElementById("ai-item-assignee-search-btn");
    const assigneeSearchInput = document.getElementById("ai-item-assignee-search-input");
    const assigneeTableWrapper = assigneeAddBtn.closest(".info-block").querySelector(".ai-item-table-wrapper table tbody");
    const assigneeEmptyNote = assigneeAddBtn.closest(".info-block").querySelector(".page-total");

    assigneeAddBtn.addEventListener("click", function () {
      openUserPickerModal(function (user) {
        const row = document.createElement("tr");
        row.innerHTML =
          "<td>" + (assigneeTableWrapper.children.length + 1) + "</td>" +
          "<td>" + user.id + "</td>" +
          "<td>" + user.name + "</td>" +
          "<td>" + user.dept + "</td>";
        assigneeTableWrapper.appendChild(row);
        if (assigneeEmptyNote) {
          assigneeEmptyNote.style.display = "none";
        }
      });
    });

    wireEnterToSearch([assigneeSearchInput], assigneeSearchBtn);
  }

  function showView(key) {
    currentView = key;
    editing = false;
    editBtn.textContent = "✏️ 수정";
    editBtn.style.display = key === "detail" ? "" : "none";
    deleteBtn.style.display = key === "detail" ? "" : "none";

    if (key === "detail") {
      mainEl.innerHTML = buildDetailViewHtml(readSource());
      wireDetailFieldEvents();
      toolbarTitleEl.textContent = "ℹ️ 상세정보";
    } else {
      mainEl.innerHTML = otherViews[key].html;
      toolbarTitleEl.textContent = "ℹ️ " + otherViews[key].title;
    }

    card.querySelectorAll("#ai-item-link-list li").forEach(function (li) {
      li.classList.toggle("link-active", li.dataset.view === key);
    });
  }

  card.querySelectorAll("#ai-item-link-list li").forEach(function (li) {
    li.addEventListener("click", function () {
      showView(li.dataset.view);
    });
  });

  showView("detail");

  editBtn.addEventListener("click", function () {
    editing = !editing;

    FIELD_IDS.forEach(function (id) {
      const el = document.getElementById(id);
      if (el) {
        el.disabled = !editing;
      }
    });

    if (editing) {
      editBtn.textContent = "💾 저장";
      return;
    }

    editBtn.textContent = "✏️ 수정";

    const status = document.getElementById("ai-item-status").value;
    const content = document.getElementById("ai-item-content").value.trim();
    const dept = document.getElementById("ai-item-dept").value.trim();
    const due = document.getElementById("ai-item-due").value.trim();

    setCellText(sourceRow.children[3], status);
    setCellText(sourceRow.children[4], content);
    setCellText(sourceRow.children[5], dept);
    setCellText(sourceRow.children[6], due);

    document.getElementById("ai-item-card-title").textContent = content;
    document.getElementById("ai-item-tree-item").textContent = content + " " + ailId + " A";

    refreshAiViewsAfterChange();
  });

  deleteBtn.addEventListener("click", function () {
    const confirmed = window.confirm("정말 삭제하시겠습니까?");
    if (!confirmed) {
      return;
    }
    sourceRow.remove();
    renumberAiRows();
    refreshAiViewsAfterChange();
    card.remove();
  });

  refreshBtn.addEventListener("click", function () {
    showView(currentView);
  });

  card.querySelector(".floating-card-close-btn").addEventListener("click", function () {
    card.remove();
  });

  card.querySelector(".floating-card-maximize-btn").addEventListener("click", function () {
    card.classList.toggle("maximized");
  });
}

// A/I List에 값이 채워진 행을 하나 추가 (생성 모달, 검색추가 모달에서 공통으로 씀)
function addAiRow(values) {
  if (!aiTableBody) {
    return;
  }

  const row = document.createElement("tr");
  row.innerHTML =
    '<td><button class="ai-view-btn" title="View">➕</button></td>' +
    "<td><button>🗑️ 연결삭제</button></td>" +
    "<td></td>" +
    '<td><span class="ai-cell-display" data-cell-type="status">' + (values.status || "진행중") + "</span></td>" +
    '<td><span class="ai-cell-display">' + (values.content || "") + "</span></td>" +
    '<td><span class="ai-cell-display">' + (values.dept || "") + "</span></td>" +
    '<td><span class="ai-cell-display" data-cell-type="date">' + (values.due || "") + "</span></td>";

  aiTableBody.appendChild(row);
  wireAiDeleteButton(row);
  wireAiViewButton(row);
  row.querySelectorAll(".ai-cell-display").forEach(function (span) {
    wireAiCellDisplay(span);
  });

  renumberAiRows();
  return row;
}

if (aiTableBody) {
  aiTableBody.querySelectorAll("tr").forEach(function (row) {
    wireAiDeleteButton(row);
    wireAiViewButton(row);
  });
  renumberAiRows();
}

if (aiAddBtn && aiTableBody) {
  aiAddBtn.addEventListener("click", function () {
    openAiCreateModal();
  });
}

// 연결정보: 상세정보 ⇄ A/I List 전체보기 화면 전환
const sidebarLinkDetail = document.getElementById("sidebar-link-detail");
const sidebarLinkAiList = document.getElementById("sidebar-link-ailist");
const detailToolbar = document.getElementById("detail-toolbar");
const ailistToolbar = document.getElementById("ailist-toolbar");
const detailMainContent = document.getElementById("detail-main-content");
const ailistMainContent = document.getElementById("ailist-main-content");
const ailistViewTableBody = document.getElementById("ailist-view-table-body");

// A/I List 전체보기 표: 지금 상세정보 탭에 있는 A/I 행들을 그대로 읽어와서 AIL-XXXXXXX ID를 붙여 보여줌
function renderAiListFullView() {
  if (!ailistViewTableBody || !aiTableBody) {
    return;
  }
  ailistViewTableBody.innerHTML = "";

  Array.from(aiTableBody.querySelectorAll("tr")).forEach(function (sourceRow, index) {
    const cells = sourceRow.children;
    const status = cells[3] ? cells[3].textContent.trim() : "";
    const content = cells[4] ? cells[4].textContent.trim() : "";
    const dept = cells[5] ? cells[5].textContent.trim() : "";
    const ailId = computeAilId(index);

    const row = document.createElement("tr");
    row.innerHTML =
      "<td>" + (index + 1) + "</td>" +
      "<td>📄</td>" +
      "<td>👤</td>" +
      '<td><button class="ailist-unlink-row-btn" title="연결삭제">🗑️</button></td>' +
      "<td>" + ailId + "</td>" +
      "<td>" + status + "</td>" +
      "<td>" + dept + "</td>" +
      "<td>" + content + "</td>";

    row.querySelector(".ailist-unlink-row-btn").addEventListener("click", function () {
      sourceRow.remove();
      renumberAiRows();
      renderAiListFullView();
    });

    ailistViewTableBody.appendChild(row);
  });
}

function showDetailView() {
  if (detailMainContent) {
    detailMainContent.style.display = "";
  }
  if (ailistMainContent) {
    ailistMainContent.style.display = "none";
  }
  if (detailToolbar) {
    detailToolbar.style.display = "";
  }
  if (ailistToolbar) {
    ailistToolbar.style.display = "none";
  }
  if (sidebarLinkDetail) {
    sidebarLinkDetail.classList.add("link-active");
  }
  if (sidebarLinkAiList) {
    sidebarLinkAiList.classList.remove("link-active");
  }
}

function showAiListView() {
  renderAiListFullView();
  if (detailMainContent) {
    detailMainContent.style.display = "none";
  }
  if (ailistMainContent) {
    ailistMainContent.style.display = "";
  }
  if (detailToolbar) {
    detailToolbar.style.display = "none";
  }
  if (ailistToolbar) {
    ailistToolbar.style.display = "";
  }
  if (sidebarLinkDetail) {
    sidebarLinkDetail.classList.remove("link-active");
  }
  if (sidebarLinkAiList) {
    sidebarLinkAiList.classList.add("link-active");
  }
}

if (sidebarLinkDetail) {
  sidebarLinkDetail.addEventListener("click", showDetailView);
}
if (sidebarLinkAiList) {
  sidebarLinkAiList.addEventListener("click", showAiListView);
}

const ailistViewAddBtn = document.getElementById("ailist-view-add-btn");
if (ailistViewAddBtn) {
  ailistViewAddBtn.addEventListener("click", function () {
    openAiCreateModal();
  });
}

const ailistViewSearchAddBtn = document.getElementById("ailist-view-search-add-btn");
if (ailistViewSearchAddBtn) {
  ailistViewSearchAddBtn.addEventListener("click", function () {
    openAiSearchAddModal();
  });
}

// A/I List가 화면에 지금 보이는 중이면(전체보기 탭) 그것도 같이 새로고침
function refreshAiViewsAfterChange() {
  if (ailistMainContent && ailistMainContent.style.display !== "none") {
    renderAiListFullView();
  }
}

// ---- 탭 상태 관리 (여러 페이지에서 localStorage로 탭 목록을 공유) ----
const TABS_KEY = "lims-open-tabs";

function getOpenTabs() {
  const saved = localStorage.getItem(TABS_KEY);
  if (saved) {
    return JSON.parse(saved);
  }
  return [{ label: "공급사 Audit", icon: "📋", url: "index.html" }];
}

function saveOpenTabs(tabs) {
  localStorage.setItem(TABS_KEY, JSON.stringify(tabs));
}

function getCurrentUrl() {
  const path = window.location.pathname.split("/").pop() || "index.html";
  return path + window.location.search;
}

// 목록에서 상세 화면으로 들어갈 때, 그 탭이 아직 없으면 추가
function openTab(label, icon, url) {
  const tabs = getOpenTabs();
  const alreadyOpen = tabs.some(function (tab) {
    return tab.url === url;
  });
  if (!alreadyOpen) {
    tabs.push({ label: label, icon: icon, url: url });
    saveOpenTabs(tabs);
  }
}

// 지금 보고 있는 페이지의 탭이 목록에 없으면(직접 주소로 들어온 경우) 자기 자신을 등록
function ensureCurrentTabRegistered() {
  const currentUrl = getCurrentUrl();
  const tabs = getOpenTabs();
  const alreadyThere = tabs.some(function (tab) {
    return tab.url === currentUrl;
  });

  if (!alreadyThere && currentUrl !== "index.html") {
    const label = document.body.dataset.tabLabel;
    const icon = document.body.dataset.tabIcon || "📄";
    if (label) {
      tabs.push({ label: label, icon: icon, url: currentUrl });
      saveOpenTabs(tabs);
    }
  }
}

// 탭을 닫음: 지금 보고 있는 탭을 닫은 거면 바로 앞 탭으로 이동, 아니면 목록만 갱신
function closeTab(url) {
  const tabs = getOpenTabs();
  const closingIndex = tabs.findIndex(function (tab) {
    return tab.url === url;
  });
  const isClosingActiveTab = url === getCurrentUrl();

  const newTabs = tabs.filter(function (tab) {
    return tab.url !== url;
  });
  saveOpenTabs(newTabs);

  if (isClosingActiveTab) {
    const fallback = tabs[closingIndex - 1] ? tabs[closingIndex - 1].url : "index.html";
    window.location.href = fallback;
  } else {
    renderTabBar();
  }
}

// 탭바를 실제로 화면에 그림
function renderTabBar() {
  const tabsContainer = document.querySelector(".tabs");
  if (!tabsContainer) {
    return;
  }

  const currentUrl = getCurrentUrl();
  const tabs = getOpenTabs();

  tabsContainer.innerHTML = "";

  tabs.forEach(function (tab, index) {
    const isActive = tab.url === currentUrl;
    const isFirst = index === 0;

    const el = document.createElement("span");
    el.className = isActive ? "tab-active" : "tab-list";

    if (isActive) {
      el.textContent = tab.icon + " " + tab.label + " ";
    } else {
      const link = document.createElement("a");
      link.href = tab.url;
      link.textContent = tab.icon + " " + tab.label;
      el.appendChild(link);
    }

    if (!isFirst) {
      const closeBtn = document.createElement("button");
      closeBtn.className = "tab-close";
      closeBtn.textContent = "✕";
      closeBtn.addEventListener("click", function () {
        closeTab(tab.url);
      });
      el.appendChild(closeBtn);
    }

    tabsContainer.appendChild(el);
  });
}

// detail.html에 ?id=... 로 들어왔으면, 그 ID의 Audit 데이터로 화면 내용을 채움
const detailUrlParams = new URLSearchParams(window.location.search);
const detailRecordId = detailUrlParams.get("id");

function renderDetailFields() {
  if (!detailRecordId || typeof getAudits !== "function") {
    return;
  }

  const record = getAudits().find(function (item) {
    return item.id === detailRecordId;
  });

  if (record) {
    const idField = document.getElementById("detail-id-field");
    const statusField = document.getElementById("detail-status-field");
    const titleField = document.getElementById("detail-title-field");
    const supplierField = document.getElementById("detail-supplier-field");
    const evalDateField = document.getElementById("detail-evaldate-field");
    const visitDateField = document.getElementById("detail-visitdate-field");
    const resultField = document.getElementById("detail-result-field");
    const resultSummaryField = document.getElementById("detail-resultsummary-field");
    const treeItem = document.getElementById("detail-tree-item");

    if (idField) {
      idField.textContent = record.id;
    }
    if (statusField) {
      statusField.textContent = record.status;
    }
    if (titleField) {
      titleField.textContent = record.title;
    }
    if (supplierField) {
      supplierField.textContent = record.supplier || "";
    }
    if (evalDateField) {
      evalDateField.textContent = record.evalDate;
    }
    if (visitDateField) {
      visitDateField.textContent = record.visitDate || "";
    }
    if (resultField) {
      resultField.textContent = record.result || "";
    }
    if (resultSummaryField) {
      resultSummaryField.textContent = record.resultSummary || "";
    }
    if (treeItem) {
      treeItem.textContent = record.title + " " + record.id;
    }

    document.body.dataset.tabLabel = record.tabLabel || record.title;
    currentDetailRecordId = record.id;
  }
}

renderDetailFields();
refreshAuditsFromServer();

ensureCurrentTabRegistered();
renderTabBar();

// 브레드크럼: 지금까지 열어서 들어온 탭 경로(Home > 목록 > ... > 현재 화면)를 반영
const breadcrumbEl = document.querySelector(".breadcrumb");

if (breadcrumbEl) {
  const currentUrl = getCurrentUrl();
  const tabs = getOpenTabs();
  const currentIndex = tabs.findIndex(function (tab) {
    return tab.url === currentUrl;
  });

  if (currentIndex >= 0) {
    const pathLabels = tabs.slice(0, currentIndex + 1).map(function (tab) {
      return tab.label;
    });
    breadcrumbEl.textContent = "🏠 Home > " + pathLabels.join(" > ");
  }
}

// 새로고침 버튼: 페이지를 다시 불러와서 저장 안 한 편집 내용을 원래대로 되돌림
document.querySelectorAll(".page-refresh-btn").forEach(function (btn) {
  btn.addEventListener("click", function () {
    window.location.reload();
  });
});

// 삭제 버튼: 확인 후 이 탭을 닫고 이전 화면으로 이동
const deleteRecordBtn = document.getElementById("delete-record-btn");

if (deleteRecordBtn) {
  deleteRecordBtn.addEventListener("click", function () {
    const confirmed = window.confirm("정말 삭제하시겠습니까?");
    if (!confirmed) {
      return;
    }

    if (currentDetailRecordId && typeof getAudits === "function") {
      const items = getAudits().filter(function (item) {
        return item.id !== currentDetailRecordId;
      });
      saveAudits(items);

      fetch(API_BASE + "/audits/" + encodeURIComponent(currentDetailRecordId), {
        method: "DELETE"
      }).catch(function (err) {
        console.error("Audit 서버 삭제 실패 (로컬에서는 삭제됨):", err);
      });
    }

    closeTab(getCurrentUrl());
  });
}

// 공급사 옆 검색 아이콘을 누르면 이 레코드에 연결된 공급사의 상세 페이지로 이동 (탭도 같이 추가)
const vendorSearchBtn = document.querySelector(".vendor-search-btn");

if (vendorSearchBtn) {
  vendorSearchBtn.addEventListener("click", function () {
    const record = currentDetailRecordId && typeof getAudits === "function"
      ? getAudits().find(function (item) { return item.id === currentDetailRecordId; })
      : null;

    const vendorId = record && record.vendorId ? record.vendorId : getVendor().id;
    const vendorName = record && record.supplier ? record.supplier : getVendor().customerName;
    const url = "vendor-detail.html?id=" + encodeURIComponent(vendorId);

    openTab(vendorName, "🏢", url);
    window.location.href = url;
  });
}

// 공급사 Audit 목록: localStorage에 저장된 데이터로 표를 그림 (삭제하면 실제로 목록에서 빠짐)
function getAudits() {
  const saved = localStorage.getItem(AUDIT_KEY);
  let items;
  if (saved) {
    items = JSON.parse(saved);
  } else {
    localStorage.setItem(AUDIT_KEY, JSON.stringify(AUDIT_SEED));
    items = AUDIT_SEED;
  }

  // 예전에 만든 행 중에 detailUrl/tabLabel이 빠졌거나 옛날 형식(?id= 없음)이면 채워넣음
  let needsSave = false;
  items.forEach(function (item) {
    if (!item.detailUrl || item.detailUrl === "detail.html") {
      item.detailUrl = "detail.html?id=" + encodeURIComponent(item.id);
      needsSave = true;
    }
    if (!item.tabLabel) {
      item.tabLabel = item.title;
      needsSave = true;
    }
  });
  if (needsSave) {
    cacheAudits(items);
  }

  return items;
}

// 로컬 캐시(localStorage)만 갱신. 서버로는 보내지 않음 — 서버에서 받아온 목록을 캐시에 반영할 때 씀
function cacheAudits(items) {
  localStorage.setItem(AUDIT_KEY, JSON.stringify(items));
}

// 사용자가 실제로 추가/수정/삭제했을 때 씀 — 로컬 캐시만 갱신 (서버 동기화는 각 버튼 핸들러에서 개별 API 호출로 처리)
function saveAudits(items) {
  cacheAudits(items);
}

// 화면에서 쓰는 Audit 행 형태 → 백엔드 AuditVO 형태로 변환
function toBackendAudit(item) {
  return {
    id: item.id,
    status: item.status,
    title: item.title,
    evalDate: dotToIsoDate(item.evalDate),
    visitDate: dotToIsoDate(item.visitDate),
    result: item.result,
    resultSummary: item.resultSummary,
    aiCount: item.aiCount,
    creator: item.creator,
    vendorId: item.vendorId || getVendor().id
  };
}

// 백엔드 AuditVO 형태 → 화면에서 쓰는 Audit 행 형태로 변환
function fromBackendAudit(vo) {
  return {
    id: vo.id,
    status: vo.status,
    supplier: vo.vendorName || "",
    vendorId: vo.vendorId,
    title: vo.title,
    evalDate: isoToDotDate(vo.evalDate),
    visitDate: isoToDotDate(vo.visitDate),
    result: vo.result || "",
    resultSummary: vo.resultSummary || "",
    aiCount: vo.aiCount || "0/0",
    creator: vo.creator || "",
    createdAt: isoToDotDate(vo.createdAt),
    modifier: vo.modifier || "",
    modifiedAt: isoToDotDate(vo.updatedAt),
    tabLabel: vo.title,
    detailUrl: "detail.html?id=" + encodeURIComponent(vo.id)
  };
}

// 서버에서 최신 Audit 목록을 받아와 캐시/화면에 반영 (서버가 꺼져 있으면 그냥 로컬 데이터로 계속 동작)
function refreshAuditsFromServer() {
  fetch(API_BASE + "/audits")
    .then(function (res) { return res.ok ? res.json() : null; })
    .then(function (list) {
      if (!list) {
        return;
      }
      cacheAudits(list.map(fromBackendAudit));
      renderAuditTable();
      renderDetailFields();
    })
    .catch(function () {});
}

function getSearchSelectValue(wrapId) {
  const wrap = document.getElementById(wrapId);
  const trigger = wrap ? wrap.querySelector(".search-select-trigger") : null;
  return trigger ? trigger.textContent.trim() : "";
}

// "검색" 버튼을 눌렀을 때의 조건만 저장 (입력칸에 타이핑하는 동안에는 필터링 안 됨)
let auditFilter = null;

// "선택:" 아이콘 토글 필터 — 새로생성[New]=검증대기, 체크인=진행중, 승인완료=완료 상태인 행만 보여줌
let iconStatusFilter = null;

function matchesAuditFilter(item) {
  if (iconStatusFilter && item.status !== iconStatusFilter) {
    return false;
  }

  if (!auditFilter) {
    return true;
  }

  if (auditFilter.idQuery && !item.id.toLowerCase().includes(auditFilter.idQuery)) {
    return false;
  }
  if (auditFilter.nameQuery && !item.title.includes(auditFilter.nameQuery)) {
    return false;
  }
  if (auditFilter.statusQuery && auditFilter.statusQuery !== "상태" && item.status !== auditFilter.statusQuery) {
    return false;
  }

  if (auditFilter.dateFieldQuery === "생성일" || auditFilter.dateFieldQuery === "수정일") {
    const rawDate = auditFilter.dateFieldQuery === "생성일" ? item.createdAt : item.modifiedAt;
    const datePart = rawDate ? rawDate.split(" ")[0] : "";
    if (auditFilter.fromQuery && datePart < auditFilter.fromQuery) {
      return false;
    }
    if (auditFilter.toQuery && datePart > auditFilter.toQuery) {
      return false;
    }
  }

  return true;
}

function renderAuditTable() {
  const tbody = document.getElementById("audit-table-body");
  if (!tbody) {
    return;
  }

  const items = getAudits().filter(matchesAuditFilter);
  tbody.innerHTML = "";

  items.forEach(function (item, index) {
    const row = document.createElement("tr");
    row.innerHTML =
      "<td>" + (index + 1) + "</td>" +
      "<td>" +
      '<button class="row-action row-action-newwindow" title="ProfileCard New Window">↗️</button>' +
      '<button class="row-action row-action-floatwindow" title="ProfileCard With Window">🪟</button>' +
      '<button class="row-action row-action-copy" title="복사 생성">📄</button>' +
      '<button class="row-action row-action-download" title="Download">⬇️</button>' +
      "</td>" +
      '<td class="id-cell"></td>' +
      "<td>" + item.status + "</td>" +
      "<td>" + item.supplier + "</td>" +
      "<td>" + item.title + "</td>" +
      "<td>" + item.evalDate + "</td>" +
      "<td>" + item.result + "</td>" +
      "<td>" + item.aiCount + "</td>" +
      "<td>" + item.creator + "</td>" +
      "<td>" + item.createdAt + "</td>" +
      "<td>" + item.modifier + "</td>" +
      "<td>" + item.modifiedAt + "</td>";

    const idCell = row.querySelector(".id-cell");
    if (item.detailUrl) {
      const link = document.createElement("a");
      link.href = item.detailUrl;
      link.className = "id-link";
      link.textContent = item.id;
      link.addEventListener("click", function () {
        openTab(item.tabLabel, "📄", item.detailUrl);
      });
      idCell.appendChild(link);
    } else {
      idCell.textContent = item.id;
    }

    // ↗️ 새 브라우저 탭에서 상세 화면 열기
    row.querySelector(".row-action-newwindow").addEventListener("click", function () {
      window.open(item.detailUrl, "_blank");
    });

    // 🪟 페이지 이동 없이 상세 화면을 플로팅 창으로 열기
    row.querySelector(".row-action-floatwindow").addEventListener("click", function () {
      openFloatingProfileCard(item);
    });

    // 📄 지금 값 그대로 채운 "공급사 Audit 추가" 화면을 새 탭으로 열기 (복사 생성)
    row.querySelector(".row-action-copy").addEventListener("click", function () {
      const url = "audit-add.html?copyFrom=" + encodeURIComponent(item.id);
      openTab(item.tabLabel + " 복사", "📄", url);
      window.location.href = url;
    });

    // ⬇️ 이 행 하나만 CSV로 내려받기
    row.querySelector(".row-action-download").addEventListener("click", function () {
      downloadAuditRowAsCsv(item);
    });

    tbody.appendChild(row);
  });

  if (auditPaginator) {
    auditPaginator.render();
  }
}

let auditPaginator = null;

if (document.getElementById("audit-table-body")) {
  auditPaginator = setupPagination({
    getAllRows: function () {
      return Array.from(document.querySelectorAll("#audit-table-body tr"));
    },
    firstBtn: document.getElementById("audit-first-btn"),
    prevBtn: document.getElementById("audit-prev-btn"),
    nextBtn: document.getElementById("audit-next-btn"),
    lastBtn: document.getElementById("audit-last-btn"),
    pageNumberList: document.getElementById("audit-page-number-list"),
    pageSizeSelect: document.getElementById("audit-page-size"),
    pageTotalEl: document.getElementById("audit-page-total"),
    emptyText: "No items to display"
  });
}

renderAuditTable();

// "선택:" 아이콘(새로생성/체크인/승인완료) — 누르면 해당 상태인 행만 필터링, 다시 누르면 해제 (동시에 하나만 활성)
const ICON_STATUS_MAP = {
  "새로생성[New]": "검증대기",
  "체크인": "진행중",
  "승인완료": "완료"
};

document.querySelectorAll(".select-icon").forEach(function (btn) {
  btn.addEventListener("click", function () {
    const status = ICON_STATUS_MAP[btn.title];
    if (!status) {
      return;
    }

    const turningOn = !btn.classList.contains("active");

    document.querySelectorAll(".select-icon").forEach(function (other) {
      other.classList.remove("active");
    });

    iconStatusFilter = turningOn ? status : null;
    if (turningOn) {
      btn.classList.add("active");
    }

    renderAuditTable();
  });
});

// "엑셀출력": 지금 화면에 보이는(검색 필터 적용된) 목록을 CSV 파일로 내려받기
const auditExcelBtn = document.getElementById("audit-excel-btn");

if (auditExcelBtn) {
  auditExcelBtn.addEventListener("click", function () {
    const items = getAudits().filter(matchesAuditFilter);
    downloadAuditsAsCsv(items, "공급사Audit_" + todayAsDisplayDate().replaceAll(".", ""));
  });
}

// Audit 행 목록을 CSV 파일로 내려받음 (엑셀출력, 행별 ⬇️ 다운로드 둘 다 이 함수를 씀)
function downloadAuditsAsCsv(items, filenameBase) {
  const headers = ["ID", "상태", "공급사", "제목", "평가일자", "종합결과", "A/I 개수", "생성자", "생성일", "수정자", "수정일"];

  const rows = items.map(function (item) {
    return [
      item.id, item.status, item.supplier, item.title, item.evalDate,
      item.result, item.aiCount, item.creator, item.createdAt, item.modifier, item.modifiedAt
    ];
  });

  const csvLines = [headers].concat(rows).map(function (row) {
    return row.map(function (cell) {
      return '"' + String(cell).replaceAll('"', '""') + '"';
    }).join(",");
  });

  const csvContent = "﻿" + csvLines.join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filenameBase + ".csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ⬇️ 행별 다운로드: 이 Audit 하나만 CSV로 내려받음 (원본은 파일 다운로드가 실패하는 기능이라, 대신 실제로 동작하는 CSV 다운로드로 대체)
function downloadAuditRowAsCsv(item) {
  downloadAuditsAsCsv([item], item.id + "_" + todayAsDisplayDate().replaceAll(".", ""));
}

// "검색" 누르면 그 시점의 입력값으로 필터 조건을 저장하고 다시 그림
const auditSearchBtn = document.getElementById("audit-search-btn");

if (auditSearchBtn) {
  auditSearchBtn.addEventListener("click", function () {
    const idInput = document.getElementById("audit-search-id");
    const nameInput = document.getElementById("audit-search-name");
    const fromInput = document.getElementById("from-input");
    const toInput = document.getElementById("to-input");

    auditFilter = {
      idQuery: idInput ? idInput.value.trim().toLowerCase() : "",
      nameQuery: nameInput ? nameInput.value.trim() : "",
      statusQuery: getSearchSelectValue("status-select"),
      dateFieldQuery: getSearchSelectValue("date-field-select"),
      fromQuery: fromInput ? fromInput.value.trim().split(" ")[0] : "",
      toQuery: toInput ? toInput.value.trim().split(" ")[0] : ""
    };

    renderAuditTable();
  });

  wireEnterToSearch(
    [
      document.getElementById("audit-search-id"),
      document.getElementById("audit-search-name"),
      document.getElementById("from-input"),
      document.getElementById("to-input")
    ],
    auditSearchBtn
  );
}

// "+ 추가" 누르면 공급사 Audit 추가 화면(audit-add.html)을 새 탭으로 열어줌 (원본 LIMS와 동일한 방식)
const auditAddBtn = document.getElementById("audit-add-btn");

if (auditAddBtn) {
  auditAddBtn.addEventListener("click", function () {
    openTab("공급사 Audit 추가", "📄", "audit-add.html");
    window.location.href = "audit-add.html";
  });
}

// audit-add.html: 원본 LIMS처럼 별도 화면에서 값 입력 후 저장/취소
const addSaveBtn = document.getElementById("add-save-btn");
const addCancelBtn = document.getElementById("add-cancel-btn");

if (addSaveBtn) {
  setupSimpleDateField("add-evaldate-input", "add-evaldate-date-btn");
  setupSimpleDateField("add-visitdate-input", "add-visitdate-date-btn");

  // 이 화면에서 고른 공급사의 ID. 아무것도 안 고르면 기본 공급사(getVendor())로 저장됨
  let addSelectedVendorId = null;

  // "복사 생성"(📄)으로 들어온 경우: ?copyFrom=원본ID 값으로 필드를 미리 채워줌 (ID는 항상 새로 채번)
  const addCopyFromId = new URLSearchParams(window.location.search).get("copyFrom");
  if (addCopyFromId && typeof getAudits === "function") {
    const sourceRecord = getAudits().find(function (item) {
      return item.id === addCopyFromId;
    });

    if (sourceRecord) {
      const titleInput = document.getElementById("add-title-input");
      const statusSelect = document.getElementById("add-status-select");
      const resultInput = document.getElementById("add-result-input");
      const supplierInput = document.getElementById("add-supplier-input");
      const resultSummaryInput = document.getElementById("add-result-summary-input");
      const evalDateInput = document.getElementById("add-evaldate-input");
      const visitDateInput = document.getElementById("add-visitdate-input");

      if (titleInput) {
        titleInput.value = sourceRecord.title || "";
      }
      if (statusSelect) {
        statusSelect.value = sourceRecord.status || "진행중";
      }
      if (resultInput) {
        resultInput.value = sourceRecord.result || "";
      }
      if (supplierInput) {
        supplierInput.value = sourceRecord.supplier || "";
      }
      if (resultSummaryInput) {
        resultSummaryInput.value = sourceRecord.resultSummary || "";
      }
      if (evalDateInput) {
        evalDateInput.value = sourceRecord.evalDate || "";
      }
      if (visitDateInput) {
        visitDateInput.value = sourceRecord.visitDate || "";
      }

      addSelectedVendorId = sourceRecord.vendorId || null;
    }
  }

  const addVendorSearchBtn = document.getElementById("add-vendor-search-btn");
  if (addVendorSearchBtn) {
    addVendorSearchBtn.addEventListener("click", function () {
      openVendorPickerModal(function (vendor) {
        const supplierInput = document.getElementById("add-supplier-input");
        if (supplierInput) {
          supplierInput.value = vendor.customerName || "";
        }
        addSelectedVendorId = vendor.id;
      });
    });
  }

  addSaveBtn.addEventListener("click", function () {
    // ID는 원본 LIMS와 동일하게 사용자가 입력하지 않고 저장 시 자동 채번됨
    const items = getAudits();
    const nextNumber = items.reduce(function (max, item) {
      const match = item.id.match(/\d+$/);
      const num = match ? parseInt(match[0], 10) : 0;
      return Math.max(max, num);
    }, 0) + 1;
    const newId = "MFA-" + String(nextNumber).padStart(7, "0");

    const today = new Date();
    const dateText = today.getFullYear() + "." + String(today.getMonth() + 1).padStart(2, "0") + "." + String(today.getDate()).padStart(2, "0");

    const statusSelect = document.getElementById("add-status-select");
    const titleInput = document.getElementById("add-title-input");
    const resultInput = document.getElementById("add-result-input");
    const supplierInput = document.getElementById("add-supplier-input");
    const resultSummaryInput = document.getElementById("add-result-summary-input");
    const evalDateInput = document.getElementById("add-evaldate-input");
    const visitDateInput = document.getElementById("add-visitdate-input");

    const newTitle = titleInput && titleInput.value.trim() ? titleInput.value.trim() : "새 공급사 Audit";

    const newItem = {
      id: newId,
      status: statusSelect ? statusSelect.value : "진행중",
      supplier: supplierInput ? supplierInput.value.trim() : "",
      vendorId: addSelectedVendorId,
      title: newTitle,
      evalDate: evalDateInput && evalDateInput.value.trim() ? evalDateInput.value.trim() : dateText,
      visitDate: visitDateInput ? visitDateInput.value.trim() : "",
      result: resultInput ? resultInput.value.trim() : "",
      resultSummary: resultSummaryInput ? resultSummaryInput.value.trim() : "",
      aiCount: "0/0",
      creator: "품질팀",
      createdAt: dateText,
      modifier: "",
      modifiedAt: "",
      tabLabel: newTitle,
      detailUrl: "detail.html?id=" + encodeURIComponent(newId)
    };

    items.push(newItem);
    saveAudits(items);

    // 서버 저장 요청이 끝나기 전에 페이지를 이동하면 요청이 중간에 취소되므로,
    // 성공/실패와 상관없이 요청이 끝난 뒤에 이동시킴 (로컬 캐시는 이미 저장돼 있어 화면은 정상 표시됨)
    fetch(API_BASE + "/audits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toBackendAudit(newItem))
    }).catch(function (err) {
      console.error("Audit 서버 생성 실패 (로컬에는 저장됨):", err);
    }).finally(function () {
      // "추가" 탭은 닫고, 방금 만든 레코드의 상세 화면 탭을 새로 열어서 이동
      const remainingTabs = getOpenTabs().filter(function (tab) {
        return tab.url !== getCurrentUrl();
      });
      remainingTabs.push({ label: newItem.tabLabel, icon: "📄", url: newItem.detailUrl });
      saveOpenTabs(remainingTabs);

      window.location.href = newItem.detailUrl;
    });
  });
}

if (addCancelBtn) {
  addCancelBtn.addEventListener("click", function () {
    closeTab(getCurrentUrl());
  });
}
