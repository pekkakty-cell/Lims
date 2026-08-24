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

// 상단 nav 메뉴: 클릭하면 카테고리별 링크가 담긴 큰 메뉴가 아래 펼쳐짐
const NAV_MEGA_CONTENT = {
  "시험관리": [
    [
      { heading: "시험", links: ["수입검사", "공정검사", "제품검사", "이력확인"] },
      { heading: "성적서", links: ["출하성적서"] }
    ],
    [
      { heading: "제품정보", links: ["제품", "원료"] }
    ]
  ],
  "품질보증": [
    [
      { heading: "부적합관리", links: ["원료부적합대책서", "제품부적합대책서"] },
      { heading: "Audit관리", links: ["공급사 Audit", "고객사 Audit"] }
    ],
    [
      { heading: "고객관리", links: ["PCN관리", "고객요청관리", "고객불만관리", "변경관리"] }
    ],
    [
      { heading: "SPC관리", links: ["SPC(종합)", "SPC(관리도)", "SPC(공정능력)"] },
      { heading: "내부심사", links: ["내부심사"] }
    ]
  ],
  "자원관리": [
    [
      { heading: "시약/소모품 관리", links: ["시약 관리", "소모품 관리"] },
      { heading: "문서관리", links: ["기술문서", "규격문서"] }
    ],
    [
      { heading: "장비관리", links: ["장비관리", "점검이력", "분석실PM점검"] },
      { heading: "LTL", links: ["원료LTL", "사업장LTL"] }
    ]
  ],
  "현황": [
    [
      { heading: "등록현황", links: ["문서", "시험"] }
    ],
    [
      { heading: "일분포현황", links: ["문서-기술문서", "문서-규격문서", "시험성적서", "시험의뢰서"] }
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

  columns.forEach(function (groups) {
    const columnEl = document.createElement("div");
    columnEl.className = "nav-mega-column";

    groups.forEach(function (group) {
      const heading = document.createElement("h4");
      heading.textContent = group.heading;
      columnEl.appendChild(heading);

      group.links.forEach(function (linkText) {
        const link = document.createElement("a");
        link.href = "#";
        link.textContent = linkText;
        columnEl.appendChild(link);
      });
    });

    navMegaMenu.appendChild(columnEl);
  });
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

// 정렬 아이콘 버튼을 누르면 오름/내림차순이 반대로 바뀜
const sortIconBtn = document.getElementById("sort-icon-btn");
const sortMenuItems = document.querySelectorAll("#sort-dropdown-menu .dropdown-item");

if (sortIconBtn) {
  sortIconBtn.addEventListener("click", function (event) {
    event.stopPropagation();

    const isAscending = sortIconBtn.textContent === "🔼";
    sortIconBtn.textContent = isAscending ? "🔽" : "🔼";

    const nextChecked = isAscending ? "최신순" : "오래된순";

    sortMenuItems.forEach(function (item) {
      const label = item.textContent.replace("✔ ", "");
      item.textContent = label === nextChecked ? "✔ " + label : label;
    });
  });
}

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
      input.value = currentValue;
      parent.replaceChild(input, span);
    }
  });
}

function exitFieldEditMode() {
  const fields = document.querySelectorAll(".field-input");

  fields.forEach(function (fieldEl) {
    const span = document.createElement("span");
    span.className = "field-display";
    if (fieldEl.tagName === "SELECT") {
      span.dataset.fieldType = fieldEl.dataset.fieldType;
    }
    span.textContent = fieldEl.value;
    fieldEl.parentElement.replaceChild(span, fieldEl);
  });
}

const remarkTextarea = document.querySelector(".remark-textarea");

if (editToggleBtn && infoTable) {
  editToggleBtn.addEventListener("click", function () {
    const turningOn = !infoTable.classList.contains("edit-mode");
    infoTable.classList.toggle("edit-mode");

    if (turningOn) {
      enterFieldEditMode();
      editToggleBtn.textContent = "💾 저장";
    } else {
      exitFieldEditMode();
      editToggleBtn.textContent = "✏️ 수정";
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
const filePageTotal = document.getElementById("file-page-total");
const filePageActive = document.getElementById("file-page-active");

function todayAsDisplayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return year + "." + month + "." + day;
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

  if (filePageTotal) {
    filePageTotal.textContent = total === 0 ? "No items to display" : "1 - " + total + " of " + total + " items";
  }
  if (filePageActive) {
    filePageActive.textContent = total === 0 ? "0" : "1";
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
const aiPageTotal = document.getElementById("ai-page-total");

function renumberAiRows() {
  const rows = aiTableBody.querySelectorAll("tr");

  rows.forEach(function (row, index) {
    const noCell = row.children[2];
    noCell.textContent = index + 1;
  });

  const total = rows.length;
  if (aiPageTotal) {
    const from = total === 0 ? 0 : 1;
    aiPageTotal.textContent = from + " - " + total + " of " + total + " items";
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

if (aiTableBody) {
  aiTableBody.querySelectorAll("tr").forEach(function (row) {
    wireAiDeleteButton(row);
  });
}

if (aiAddBtn && aiTableBody) {
  aiAddBtn.addEventListener("click", function () {
    const row = document.createElement("tr");
    row.innerHTML =
      "<td>➕</td>" +
      "<td><button>🗑️ 연결삭제</button></td>" +
      "<td></td>" +
      '<td><span class="ai-cell-display" data-cell-type="status">진행중</span></td>' +
      '<td><input type="text" class="ai-cell-input"></td>' +
      '<td><input type="text" class="ai-cell-input"></td>' +
      '<td><span class="ai-cell-display" data-cell-type="date"></span></td>';

    aiTableBody.appendChild(row);
    wireAiDeleteButton(row);
    row.querySelectorAll(".ai-cell-input").forEach(function (input) {
      makeAiCellEditable(input);
    });
    row.querySelectorAll(".ai-cell-display").forEach(function (span) {
      wireAiCellDisplay(span);
    });
    renumberAiRows();
  });
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
  return window.location.pathname.split("/").pop() || "index.html";
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

ensureCurrentTabRegistered();
renderTabBar();

// 공급사 옆 검색 아이콘을 누르면 공급사 상세 페이지로 이동 (탭도 같이 추가)
const vendorSearchBtn = document.querySelector(".vendor-search-btn");

if (vendorSearchBtn) {
  vendorSearchBtn.addEventListener("click", function () {
    openTab("Nikka Finetech", "🏢", "vendor-detail.html");
    window.location.href = "vendor-detail.html";
  });
}

// 목록에서 ID를 누르면 상세 화면으로 이동 (탭도 같이 추가)
const auditDetailLink = document.getElementById("audit-detail-1");

if (auditDetailLink) {
  auditDetailLink.addEventListener("click", function () {
    openTab("260316 삼성파운드리 원재료 집중점검 요청 A", "📄", "detail.html");
  });
}
