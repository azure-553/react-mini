// 가상 노드를 생성하는 함수
function h(tag, propsOrChildren, maybeChildren) {
  //비어있는 객체 생성
  let vnode = {};
  vnode.tag = tag;

  if (
    Array.isArray(propsOrChildren) ||
    typeof propsOrChildren === "string" ||
    typeof propsOrChildren === "number"
  ) {
    vnode.children = propsOrChildren;
    vnode.props = {};
  } else {
    vnode.props = propsOrChildren || {};
    vnode.children = maybeChildren || [];
  }

  return vnode;
}

// 실제 DOM 요소를 생성하는 함수
function createElement(vnode) {
  // TODO: vnode를 기반으로 실제 DOM 요소를 생성
  if (typeof vnode === "string" || typeof vnode === "number") {
    return document.createTextNode(vnode.toString());
  }

  const element = document.createElement(vnode.tag);

  // props 설정
  if (vnode.props) {
    // 이벤트 리스너 추적을 위한 객체 생성
    element._eventListeners = {};

    for (const [key, value] of Object.entries(vnode.props)) {
      if (key.startsWith("on") && typeof value === "function") {
        // 이벤트 리스너 처리
        const eventType = key.slice(2).toLowerCase();
        element._eventListeners[eventType] = value;
        element.addEventListener(eventType, value);
      } else if (key === "className") {
        element.className = value;
      } else if (key === "style" && typeof value === "object") {
        Object.assign(element.style, value);
      } else {
        element.setAttribute(key, value);
      }
    }
  }

  // children 처리
  if (
    typeof vnode.children === "string" ||
    typeof vnode.children === "number"
  ) {
    const textNode = document.createTextNode(vnode.children.toString());
    element.appendChild(textNode);
  } else if (Array.isArray(vnode.children)) {
    vnode.children.forEach((child) => {
      const childEl = createElement(child);
      element.appendChild(childEl);
    });
  }

  return element;
}

// 두 개의 가상 노드를 비교하여 변경 사항을 적용하는 함수
function patch(oldVNode, newVNode, parent, index = 0) {
  // 1. 태그가 다르면 => 기존 DOM 제거 + 새로 생성해서 container에 추가
  // 새 노드가 없으면 기존 노드 제거
  if (!newVNode) {
    if (parent.childNodes[index]) {
      parent.removeChild(parent.childNodes[index]);
    }
    return;
  }

  // 기존 노드가 없으면 새 노드 추가
  if (!oldVNode) {
    parent.appendChild(createElement(newVNode));
    return;
  }

  // 문자열/숫자 노드 처리
  if (
    typeof oldVNode === "string" ||
    typeof oldVNode === "number" ||
    typeof newVNode === "string" ||
    typeof newVNode === "number"
  ) {
    if (oldVNode !== newVNode) {
      parent.replaceChild(createElement(newVNode), parent.childNodes[index]);
    }
    return;
  }

  // 태그가 다르면 교체
  if (oldVNode.tag !== newVNode.tag) {
    parent.replaceChild(createElement(newVNode), parent.childNodes[index]);
    return;
  }

  // 2. 태그가 같으면 => 기존 DOM 재사용
  const element = parent.childNodes[index];

  // 3. props 비교
  patchProps(element, oldVNode.props || {}, newVNode.props || {});

  // 4. children 비교
  patchChildren(element, oldVNode.children, newVNode.children);
}

// props 패치 함수
function patchProps(element, oldProps, newProps) {
  // 제거된 props 처리
  for (const key in oldProps) {
    if (!(key in newProps)) {
      if (key.startsWith("on")) {
        // 이벤트 리스너 제거 - 기존 리스너 제거
        const eventType = key.slice(2).toLowerCase();
        if (element._eventListeners && element._eventListeners[eventType]) {
          element.removeEventListener(
            eventType,
            element._eventListeners[eventType]
          );
          delete element._eventListeners[eventType];
        }
      } else if (key === "className") {
        element.className = "";
      } else {
        element.removeAttribute(key);
      }
    }
  }

  // 새로운/변경된 props 처리
  for (const key in newProps) {
    if (oldProps[key] !== newProps[key]) {
      if (key.startsWith("on") && typeof newProps[key] === "function") {
        const eventType = key.slice(2).toLowerCase();

        // 기존 이벤트 리스너가 있으면 제거
        if (!element._eventListeners) element._eventListeners = {};
        if (element._eventListeners[eventType]) {
          element.removeEventListener(
            eventType,
            element._eventListeners[eventType]
          );
        }

        // 새 이벤트 리스너 등록
        element._eventListeners[eventType] = newProps[key];
        element.addEventListener(eventType, newProps[key]);
      } else if (key === "className") {
        element.className = newProps[key];
      } else if (key === "style" && typeof newProps[key] === "object") {
        Object.assign(element.style, newProps[key]);
      } else {
        element.setAttribute(key, newProps[key]);
      }
    }
  }
}

// children 패치 함수
function patchChildren(parent, oldChildren, newChildren) {
  // 4-1. 문자열 vs 문자열
  // 4-2. 문자열 vs 배열
  // 4-3. 배열 vs 문자열
  // 4-4. 배열 vs 배열

  // 배열이 아닌 경우 배열로 변환
  const oldChildrenArray = Array.isArray(oldChildren)
    ? oldChildren
    : [oldChildren];
  const newChildrenArray = Array.isArray(newChildren)
    ? newChildren
    : [newChildren];

  const maxLength = Math.max(oldChildrenArray.length, newChildrenArray.length);

  for (let i = 0; i < maxLength; i++) {
    patch(oldChildrenArray[i], newChildrenArray[i], parent, i);
  }
}

// 상태 관리
let appState = {
  count: 0,
  message: "Mini React Demo",
  isPatched: false,
};

// 이전 vnode를 저장해둘 변수
const vDom = (function () {
  let preNode = null;

  return {
    getPreNode: () => preNode,
    setPreNode: (node) => {
      preNode = node;
    },
  };
})();

// 앱 컴포넌트
function App() {
  return h(
    "div",
    { id: "app", className: appState.isPatched ? "patched" : "" },
    [
      h("h1", {}, appState.message),
      h("div", { className: "counter" }, appState.count),
      h("div", { className: "status" }, [
        h("p", {}, `현재 카운트: ${appState.count}`),
        h("p", {}, `상태: ${appState.isPatched ? "패치됨" : "기본"}`),
      ]),
      h(
        "button",
        {
          onClick: () => {
            appState.count++;
            render();
          },
        },
        "카운트 증가"
      ),
      h(
        "button",
        {
          onClick: () => {
            appState.count--;
            render();
          },
        },
        "카운트 감소"
      ),
      h(
        "button",
        {
          onClick: () => {
            appState.message =
              appState.message === "Mini React Demo"
                ? "패치 완료"
                : "Mini React Demo";
            appState.isPatched = !appState.isPatched;
            render();
          },
        },
        "메시지 변경"
      ),
    ]
  );
}

// 렌더링 함수
function render() {
  const container = document.getElementById("root");
  const oldVNode = vDom.getPreNode();
  const newVNode = App();

  if (!oldVNode) {
    // 첫 렌더링
    container.appendChild(createElement(newVNode));
  } else {
    // 패치
    patch(oldVNode, newVNode, container, 0);
  }

  vDom.setPreNode(newVNode);
}

// DOM이 로드된 후 실행
document.addEventListener("DOMContentLoaded", function () {
  // 초기 렌더링
  render();
});
