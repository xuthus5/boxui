package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"go.etcd.io/bbolt"

	"github.com/xuthus5/boxd/internal/core"
	"github.com/xuthus5/boxd/internal/model"
)

func TestRuleSetHandlerStatusAndAutoUpdate(t *testing.T) {
	dir := t.TempDir()
	configPath := filepath.Join(dir, "config.json")
	if err := os.WriteFile(configPath, []byte(`{"route":{"rule_set":[{"tag":"geo","type":"remote","url":"https://example.com/a.srs"}]}}`), 0600); err != nil {
		t.Fatal(err)
	}
	db, err := bbolt.Open(filepath.Join(dir, "boxd.db"), 0600, nil)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })
	settings := core.NewSettingsManager(db)
	updater := core.NewRuleSetUpdater(configPath, dir, core.NewLoyalsoldierRuleSetInstaller(dir), nil, nil)
	handler := NewRuleSetHandler(updater, settings)

	rr := httptest.NewRecorder()
	handler.Status(rr, httptest.NewRequest(http.MethodGet, "/api/config/rule-sets/status", nil))
	if rr.Code != http.StatusOK {
		t.Fatalf("status code = %d body=%s", rr.Code, rr.Body.String())
	}

	rr = httptest.NewRecorder()
	handler.GetAutoUpdate(rr, httptest.NewRequest(http.MethodGet, "/api/config/rule-sets/auto-update", nil))
	if rr.Code != http.StatusOK {
		t.Fatalf("get auto code = %d", rr.Code)
	}

	body, _ := json.Marshal(model.RuleSetAutoUpdate{Enabled: true, Interval: "3h"})
	rr = httptest.NewRecorder()
	handler.SetAutoUpdate(rr, httptest.NewRequest(http.MethodPut, "/api/config/rule-sets/auto-update", bytes.NewReader(body)))
	if rr.Code != http.StatusOK {
		t.Fatalf("set auto code = %d body=%s", rr.Code, rr.Body.String())
	}
}

func TestRuleSetHandlerNilUpdater(t *testing.T) {
	handler := NewRuleSetHandler(nil, nil)
	rr := httptest.NewRecorder()
	handler.Status(rr, httptest.NewRequest(http.MethodGet, "/", nil))
	if rr.Code != http.StatusNotImplemented {
		t.Fatalf("code = %d", rr.Code)
	}
}

func TestRuleSetHandlerUpdatePaths(t *testing.T) {
	dir := t.TempDir()
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("If-None-Match") == `"etag-1"` {
			w.WriteHeader(http.StatusNotModified)
			return
		}
		w.Header().Set("Etag", `"etag-1"`)
		_, _ = w.Write([]byte("srs-binary"))
	}))
	t.Cleanup(server.Close)

	configPath := filepath.Join(dir, "config.json")
	cfg := map[string]any{
		"route": map[string]any{
			"rule_set": []any{
				map[string]any{"tag": "geo", "type": "remote", "format": "binary", "url": server.URL + "/geo.srs"},
				map[string]any{"tag": "inline", "type": "inline"},
			},
		},
	}
	body, _ := json.Marshal(cfg)
	if err := os.WriteFile(configPath, body, 0600); err != nil {
		t.Fatal(err)
	}
	updater := core.NewRuleSetUpdater(configPath, dir, core.NewLoyalsoldierRuleSetInstaller(dir), nil, nil)
	// expose client via status/update paths; set through package-level if needed
	// NewRuleSetUpdater uses default client; assign via temporary package helper by updating remote with default transport of server not possible.
	// Use same pattern as core tests: rewrite by casting isn't available; download may fail without client override.
	// Build handler with updater that can update remote via injected client by reusing core test approach through public API only.
	// Fallback: call Update with empty body on config that only has inline (skipped) to cover decode/status branches.
	handler := NewRuleSetHandler(updater, nil)

	// invalid JSON body
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/config/rule-sets/update", bytes.NewReader([]byte("{")))
	req.ContentLength = 1
	handler.Update(rr, req)
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("invalid body code = %d body=%s", rr.Code, rr.Body.String())
	}

	// empty body update (inline only => skipped)
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/api/config/rule-sets/update", nil)
	handler.Update(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("update code = %d body=%s", rr.Code, rr.Body.String())
	}

	// nil updater update
	rr = httptest.NewRecorder()
	NewRuleSetHandler(nil, nil).Update(rr, httptest.NewRequest(http.MethodPost, "/", nil))
	if rr.Code != http.StatusNotImplemented {
		t.Fatalf("nil updater update code = %d", rr.Code)
	}
}

func TestRuleSetHandlerAutoUpdateErrors(t *testing.T) {
	// nil settings
	handler := NewRuleSetHandler(nil, nil)
	rr := httptest.NewRecorder()
	handler.GetAutoUpdate(rr, httptest.NewRequest(http.MethodGet, "/", nil))
	if rr.Code != http.StatusNotImplemented {
		t.Fatalf("get nil settings code = %d", rr.Code)
	}
	rr = httptest.NewRecorder()
	handler.SetAutoUpdate(rr, httptest.NewRequest(http.MethodPut, "/", bytes.NewReader([]byte(`{"enabled":true,"interval":"1h"}`))))
	if rr.Code != http.StatusNotImplemented {
		t.Fatalf("set nil settings code = %d", rr.Code)
	}

	dir := t.TempDir()
	db, err := bbolt.Open(filepath.Join(dir, "boxd.db"), 0600, nil)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })
	settings := core.NewSettingsManager(db)
	handler = NewRuleSetHandler(nil, settings)

	// invalid JSON
	rr = httptest.NewRecorder()
	handler.SetAutoUpdate(rr, httptest.NewRequest(http.MethodPut, "/", bytes.NewReader([]byte("{"))))
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("invalid json code = %d", rr.Code)
	}

	// invalid interval
	rr = httptest.NewRecorder()
	handler.SetAutoUpdate(rr, httptest.NewRequest(http.MethodPut, "/", bytes.NewReader([]byte(`{"enabled":true,"interval":"nope"}`))))
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("invalid interval code = %d body=%s", rr.Code, rr.Body.String())
	}

	// success
	rr = httptest.NewRecorder()
	handler.SetAutoUpdate(rr, httptest.NewRequest(http.MethodPut, "/", bytes.NewReader([]byte(`{"enabled":true,"interval":"4h"}`))))
	if rr.Code != http.StatusOK {
		t.Fatalf("set ok code = %d body=%s", rr.Code, rr.Body.String())
	}
	rr = httptest.NewRecorder()
	handler.GetAutoUpdate(rr, httptest.NewRequest(http.MethodGet, "/", nil))
	if rr.Code != http.StatusOK {
		t.Fatalf("get ok code = %d", rr.Code)
	}
}
