(function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) {
    return;
  }
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) {
    processPreload(link);
  }
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") {
        continue;
      }
      for (const node of mutation.addedNodes) {
        if (node.tagName === "LINK" && node.rel === "modulepreload")
          processPreload(node);
      }
    }
  }).observe(document, { childList: true, subtree: true });
  function getFetchOpts(link) {
    const fetchOpts = {};
    if (link.integrity) fetchOpts.integrity = link.integrity;
    if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
    if (link.crossOrigin === "use-credentials")
      fetchOpts.credentials = "include";
    else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
    else fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep)
      return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
})();
function print(method, ...args) {
  if (typeof args[0] === "string") {
    const message = args.shift();
    method(`[wxt] ${message}`, ...args);
  } else {
    method("[wxt]", ...args);
  }
}
const logger = {
  debug: (...args) => print(console.debug, ...args),
  log: (...args) => print(console.log, ...args),
  warn: (...args) => print(console.warn, ...args),
  error: (...args) => print(console.error, ...args)
};
let ws;
function getDevServerWebSocket() {
  if (ws == null) {
    const serverUrl = "http://localhost:3000";
    logger.debug("Connecting to dev server @", serverUrl);
    ws = new WebSocket(serverUrl, "vite-hmr");
    ws.addWxtEventListener = ws.addEventListener.bind(ws);
    ws.sendCustom = (event, payload) => ws == null ? void 0 : ws.send(JSON.stringify({ type: "custom", event, payload }));
    ws.addEventListener("open", () => {
      logger.debug("Connected to dev server");
    });
    ws.addEventListener("close", () => {
      logger.debug("Disconnected from dev server");
    });
    ws.addEventListener("error", (event) => {
      logger.error("Failed to connect to dev server", event);
    });
    ws.addEventListener("message", (e) => {
      try {
        const message = JSON.parse(e.data);
        if (message.type === "custom") {
          ws == null ? void 0 : ws.dispatchEvent(
            new CustomEvent(message.event, { detail: message.data })
          );
        }
      } catch (err) {
        logger.error("Failed to handle message", err);
      }
    });
  }
  return ws;
}
{
  try {
    const ws2 = getDevServerWebSocket();
    ws2.addWxtEventListener("wxt:reload-page", (event) => {
      if (event.detail === location.pathname.substring(1)) location.reload();
    });
  } catch (err) {
    logger.error("Failed to setup web socket connection with dev server", err);
  }
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9wdXAtZjAyUUtqWHAuanMiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL25vZGVfbW9kdWxlcy93eHQvZGlzdC92aXJ0dWFsL3JlbG9hZC1odG1sLm1qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJmdW5jdGlvbiBwcmludChtZXRob2QsIC4uLmFyZ3MpIHtcbiAgaWYgKGltcG9ydC5tZXRhLmVudi5NT0RFID09PSBcInByb2R1Y3Rpb25cIikgcmV0dXJuO1xuICBpZiAodHlwZW9mIGFyZ3NbMF0gPT09IFwic3RyaW5nXCIpIHtcbiAgICBjb25zdCBtZXNzYWdlID0gYXJncy5zaGlmdCgpO1xuICAgIG1ldGhvZChgW3d4dF0gJHttZXNzYWdlfWAsIC4uLmFyZ3MpO1xuICB9IGVsc2Uge1xuICAgIG1ldGhvZChcIlt3eHRdXCIsIC4uLmFyZ3MpO1xuICB9XG59XG5jb25zdCBsb2dnZXIgPSB7XG4gIGRlYnVnOiAoLi4uYXJncykgPT4gcHJpbnQoY29uc29sZS5kZWJ1ZywgLi4uYXJncyksXG4gIGxvZzogKC4uLmFyZ3MpID0+IHByaW50KGNvbnNvbGUubG9nLCAuLi5hcmdzKSxcbiAgd2FybjogKC4uLmFyZ3MpID0+IHByaW50KGNvbnNvbGUud2FybiwgLi4uYXJncyksXG4gIGVycm9yOiAoLi4uYXJncykgPT4gcHJpbnQoY29uc29sZS5lcnJvciwgLi4uYXJncylcbn07XG5cbmxldCB3cztcbmZ1bmN0aW9uIGdldERldlNlcnZlcldlYlNvY2tldCgpIHtcbiAgaWYgKGltcG9ydC5tZXRhLmVudi5DT01NQU5EICE9PSBcInNlcnZlXCIpXG4gICAgdGhyb3cgRXJyb3IoXG4gICAgICBcIk11c3QgYmUgcnVubmluZyBXWFQgZGV2IGNvbW1hbmQgdG8gY29ubmVjdCB0byBjYWxsIGdldERldlNlcnZlcldlYlNvY2tldCgpXCJcbiAgICApO1xuICBpZiAod3MgPT0gbnVsbCkge1xuICAgIGNvbnN0IHNlcnZlclVybCA9IF9fREVWX1NFUlZFUl9PUklHSU5fXztcbiAgICBsb2dnZXIuZGVidWcoXCJDb25uZWN0aW5nIHRvIGRldiBzZXJ2ZXIgQFwiLCBzZXJ2ZXJVcmwpO1xuICAgIHdzID0gbmV3IFdlYlNvY2tldChzZXJ2ZXJVcmwsIFwidml0ZS1obXJcIik7XG4gICAgd3MuYWRkV3h0RXZlbnRMaXN0ZW5lciA9IHdzLmFkZEV2ZW50TGlzdGVuZXIuYmluZCh3cyk7XG4gICAgd3Muc2VuZEN1c3RvbSA9IChldmVudCwgcGF5bG9hZCkgPT4gd3M/LnNlbmQoSlNPTi5zdHJpbmdpZnkoeyB0eXBlOiBcImN1c3RvbVwiLCBldmVudCwgcGF5bG9hZCB9KSk7XG4gICAgd3MuYWRkRXZlbnRMaXN0ZW5lcihcIm9wZW5cIiwgKCkgPT4ge1xuICAgICAgbG9nZ2VyLmRlYnVnKFwiQ29ubmVjdGVkIHRvIGRldiBzZXJ2ZXJcIik7XG4gICAgfSk7XG4gICAgd3MuYWRkRXZlbnRMaXN0ZW5lcihcImNsb3NlXCIsICgpID0+IHtcbiAgICAgIGxvZ2dlci5kZWJ1ZyhcIkRpc2Nvbm5lY3RlZCBmcm9tIGRldiBzZXJ2ZXJcIik7XG4gICAgfSk7XG4gICAgd3MuYWRkRXZlbnRMaXN0ZW5lcihcImVycm9yXCIsIChldmVudCkgPT4ge1xuICAgICAgbG9nZ2VyLmVycm9yKFwiRmFpbGVkIHRvIGNvbm5lY3QgdG8gZGV2IHNlcnZlclwiLCBldmVudCk7XG4gICAgfSk7XG4gICAgd3MuYWRkRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgKGUpID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBKU09OLnBhcnNlKGUuZGF0YSk7XG4gICAgICAgIGlmIChtZXNzYWdlLnR5cGUgPT09IFwiY3VzdG9tXCIpIHtcbiAgICAgICAgICB3cz8uZGlzcGF0Y2hFdmVudChcbiAgICAgICAgICAgIG5ldyBDdXN0b21FdmVudChtZXNzYWdlLmV2ZW50LCB7IGRldGFpbDogbWVzc2FnZS5kYXRhIH0pXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIGxvZ2dlci5lcnJvcihcIkZhaWxlZCB0byBoYW5kbGUgbWVzc2FnZVwiLCBlcnIpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG4gIHJldHVybiB3cztcbn1cblxuaWYgKGltcG9ydC5tZXRhLmVudi5DT01NQU5EID09PSBcInNlcnZlXCIpIHtcbiAgdHJ5IHtcbiAgICBjb25zdCB3cyA9IGdldERldlNlcnZlcldlYlNvY2tldCgpO1xuICAgIHdzLmFkZFd4dEV2ZW50TGlzdGVuZXIoXCJ3eHQ6cmVsb2FkLXBhZ2VcIiwgKGV2ZW50KSA9PiB7XG4gICAgICBpZiAoZXZlbnQuZGV0YWlsID09PSBsb2NhdGlvbi5wYXRobmFtZS5zdWJzdHJpbmcoMSkpIGxvY2F0aW9uLnJlbG9hZCgpO1xuICAgIH0pO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICBsb2dnZXIuZXJyb3IoXCJGYWlsZWQgdG8gc2V0dXAgd2ViIHNvY2tldCBjb25uZWN0aW9uIHdpdGggZGV2IHNlcnZlclwiLCBlcnIpO1xuICB9XG59XG4iXSwibmFtZXMiOlsid3MiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxTQUFTLE1BQU0sV0FBVyxNQUFNO0FBRTlCLE1BQUksT0FBTyxLQUFLLENBQUMsTUFBTSxVQUFVO0FBQ3pCLFVBQUEsVUFBVSxLQUFLLE1BQU07QUFDM0IsV0FBTyxTQUFTLE9BQU8sSUFBSSxHQUFHLElBQUk7QUFBQSxFQUFBLE9BQzdCO0FBQ0UsV0FBQSxTQUFTLEdBQUcsSUFBSTtBQUFBLEVBQUE7QUFFM0I7QUFDQSxNQUFNLFNBQVM7QUFBQSxFQUNiLE9BQU8sSUFBSSxTQUFTLE1BQU0sUUFBUSxPQUFPLEdBQUcsSUFBSTtBQUFBLEVBQ2hELEtBQUssSUFBSSxTQUFTLE1BQU0sUUFBUSxLQUFLLEdBQUcsSUFBSTtBQUFBLEVBQzVDLE1BQU0sSUFBSSxTQUFTLE1BQU0sUUFBUSxNQUFNLEdBQUcsSUFBSTtBQUFBLEVBQzlDLE9BQU8sSUFBSSxTQUFTLE1BQU0sUUFBUSxPQUFPLEdBQUcsSUFBSTtBQUNsRDtBQUVBLElBQUk7QUFDSixTQUFTLHdCQUF3QjtBQUsvQixNQUFJLE1BQU0sTUFBTTtBQUNkLFVBQU0sWUFBWTtBQUNYLFdBQUEsTUFBTSw4QkFBOEIsU0FBUztBQUMvQyxTQUFBLElBQUksVUFBVSxXQUFXLFVBQVU7QUFDeEMsT0FBRyxzQkFBc0IsR0FBRyxpQkFBaUIsS0FBSyxFQUFFO0FBQ3BELE9BQUcsYUFBYSxDQUFDLE9BQU8sWUFBWSx5QkFBSSxLQUFLLEtBQUssVUFBVSxFQUFFLE1BQU0sVUFBVSxPQUFPLFFBQVMsQ0FBQTtBQUMzRixPQUFBLGlCQUFpQixRQUFRLE1BQU07QUFDaEMsYUFBTyxNQUFNLHlCQUF5QjtBQUFBLElBQUEsQ0FDdkM7QUFDRSxPQUFBLGlCQUFpQixTQUFTLE1BQU07QUFDakMsYUFBTyxNQUFNLDhCQUE4QjtBQUFBLElBQUEsQ0FDNUM7QUFDRSxPQUFBLGlCQUFpQixTQUFTLENBQUMsVUFBVTtBQUMvQixhQUFBLE1BQU0sbUNBQW1DLEtBQUs7QUFBQSxJQUFBLENBQ3REO0FBQ0UsT0FBQSxpQkFBaUIsV0FBVyxDQUFDLE1BQU07QUFDaEMsVUFBQTtBQUNGLGNBQU0sVUFBVSxLQUFLLE1BQU0sRUFBRSxJQUFJO0FBQzdCLFlBQUEsUUFBUSxTQUFTLFVBQVU7QUFDekIsbUNBQUE7QUFBQSxZQUNGLElBQUksWUFBWSxRQUFRLE9BQU8sRUFBRSxRQUFRLFFBQVEsS0FBTSxDQUFBO0FBQUE7QUFBQSxRQUN6RDtBQUFBLGVBRUssS0FBSztBQUNMLGVBQUEsTUFBTSw0QkFBNEIsR0FBRztBQUFBLE1BQUE7QUFBQSxJQUM5QyxDQUNEO0FBQUEsRUFBQTtBQUVJLFNBQUE7QUFDVDtBQUV5QztBQUNuQyxNQUFBO0FBQ0YsVUFBTUEsTUFBSyxzQkFBc0I7QUFDakNBLFFBQUcsb0JBQW9CLG1CQUFtQixDQUFDLFVBQVU7QUFDL0MsVUFBQSxNQUFNLFdBQVcsU0FBUyxTQUFTLFVBQVUsQ0FBQyxZQUFZLE9BQU87QUFBQSxJQUFBLENBQ3RFO0FBQUEsV0FDTSxLQUFLO0FBQ0wsV0FBQSxNQUFNLHlEQUF5RCxHQUFHO0FBQUEsRUFBQTtBQUU3RTsiLCJ4X2dvb2dsZV9pZ25vcmVMaXN0IjpbMF19
