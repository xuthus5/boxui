package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"

	"github.com/xuthus5/boxd/internal/core"
	"github.com/xuthus5/boxd/internal/model"
)

func (h *ConfigHandler) routeRules() ([]any, error) {
	data, err := os.ReadFile(h.configPath)
	if err != nil {
		return nil, fmt.Errorf("reading config: %w", err)
	}
	var config map[string]any
	if err := json.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("decoding config: %w", err)
	}
	route, _ := config["route"].(map[string]any)
	rules, _ := route["rules"].([]any)
	return rules, nil
}

func (h *ConfigHandler) GetRouteRuleMetadata(w http.ResponseWriter, _ *http.Request) {
	if h.routeMetadata == nil {
		writeJSONError(w, http.StatusNotImplemented, "route rule metadata is not configured")
		return
	}
	rules, err := h.routeRules()
	if err != nil {
		writeJSONErrorCode(w, http.StatusInternalServerError, model.ErrorInternal, "failed to load route rules")
		return
	}
	if err := h.routeMetadata.InitializeDefaultNames(rules); err != nil {
		writeJSONErrorCode(w, http.StatusInternalServerError, model.ErrorInternal, "failed to initialize route rule metadata")
		return
	}
	metadata, err := h.routeMetadata.List(rules)
	if err != nil {
		writeJSONErrorCode(w, http.StatusInternalServerError, model.ErrorInternal, "failed to load route rule metadata")
		return
	}
	writeJSON(w, http.StatusOK, metadata)
}

func (h *ConfigHandler) UpdateRouteRuleMetadata(w http.ResponseWriter, r *http.Request) {
	if h.routeMetadata == nil {
		writeJSONError(w, http.StatusNotImplemented, "route rule metadata is not configured")
		return
	}
	var metadata []model.RouteRuleMetadata
	if err := json.NewDecoder(r.Body).Decode(&metadata); err != nil {
		writeJSONErrorCode(w, http.StatusBadRequest, model.ErrorInvalidRequest, "invalid route rule metadata")
		return
	}
	rules, err := h.routeRules()
	if err != nil {
		writeJSONErrorCode(w, http.StatusInternalServerError, model.ErrorInternal, "failed to load route rules")
		return
	}
	if err := h.routeMetadata.Save(rules, metadata); err != nil {
		if errors.Is(err, core.ErrInvalidRouteRuleMetadata) {
			writeJSONErrorCode(w, http.StatusBadRequest, model.ErrorInvalidRequest, err.Error())
			return
		}
		writeJSONErrorCode(w, http.StatusInternalServerError, model.ErrorInternal, "failed to save route rule metadata")
		return
	}
	saved, err := h.routeMetadata.List(rules)
	if err != nil {
		writeJSONErrorCode(w, http.StatusInternalServerError, model.ErrorInternal, "failed to load saved route rule metadata")
		return
	}
	writeJSON(w, http.StatusOK, saved)
}
