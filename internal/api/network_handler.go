package api

import (
	"net"
	"net/http"
	"sort"
	"strings"
)

type NetworkHandler struct{}

type InterfaceInfo struct {
	Name string   `json:"name"`
	IPs  []string `json:"ips"`
}

var listInterfaces = net.Interfaces

var interfaceAddrs = func(iface net.Interface) ([]net.Addr, error) {
	return iface.Addrs()
}

func NewNetworkHandler() *NetworkHandler {
	return &NetworkHandler{}
}

func (h *NetworkHandler) GetInterfaces(w http.ResponseWriter, r *http.Request) {
	ifaces, err := listInterfaces()
	if err != nil {
		writeJSONErrorCode(w, http.StatusInternalServerError, "internal", "failed to list network interfaces")
		return
	}

	result := make([]InterfaceInfo, 0, len(ifaces))
	for _, iface := range ifaces {
		name := strings.TrimSpace(iface.Name)
		if name == "" || name == "lo" {
			continue
		}
		addrs, err := interfaceAddrs(iface)
		if err != nil {
			continue
		}
		ips := make([]string, 0, len(addrs))
		for _, addr := range addrs {
			ipNet, ok := addr.(*net.IPNet)
			if !ok || ipNet.IP == nil {
				continue
			}
			ip := ipNet.IP
			if ip.IsLoopback() {
				continue
			}
			ips = append(ips, ip.String())
		}
		result = append(result, InterfaceInfo{Name: name, IPs: ips})
	}
	sort.Slice(result, func(i, j int) bool { return result[i].Name < result[j].Name })
	writeJSON(w, http.StatusOK, map[string]any{"interfaces": result})
}
