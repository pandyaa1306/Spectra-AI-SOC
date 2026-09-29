import React, { useState } from 'react';
import {
  Network,
  User,
  Laptop,
  Globe,
  Terminal,
  Wifi,
  AppWindow,
  ShieldAlert,
  Search,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  CheckCircle,
  ExternalLink,
  Lock,
  ArrowRight,
} from 'lucide-react';
import { AttackGraphNode, AttackGraphEdge } from '../types/soc';

interface AttackGraphProps {
  nodes: AttackGraphNode[];
  edges: AttackGraphEdge[];
  onOpenSwimlaneModal: () => void;
}

export const AttackGraph: React.FC<AttackGraphProps> = ({
  nodes,
  edges,
  onOpenSwimlaneModal,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string>('node-incident');
  const [filterType, setFilterType] = useState<string>('all');
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0];

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'user':
        return <User className="w-4 h-4 text-cyan-400" />;
      case 'device':
        return <Laptop className="w-4 h-4 text-indigo-400" />;
      case 'ip':
        return <Globe className="w-4 h-4 text-rose-400" />;
      case 'process':
        return <Terminal className="w-4 h-4 text-amber-400" />;
      case 'network':
        return <Wifi className="w-4 h-4 text-orange-400" />;
      case 'application':
        return <AppWindow className="w-4 h-4 text-purple-400" />;
      case 'incident':
      default:
        return <ShieldAlert className="w-5 h-5 text-rose-400" />;
    }
  };

  const filteredNodes = nodes.filter((n) => {
    if (filterType === 'all') return true;
    return n.type === filterType;
  });

  return (
    <div className="space-y-4">
      {/* Graph Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-cyan-400" />
          <h2 className="font-bold text-white uppercase tracking-wider">Multi-Entity Attack Chain Graph</h2>
          <span className="text-slate-400 font-mono">({nodes.length} Nodes • {edges.length} Relationships)</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Entity Filter */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-1">
            {['all', 'user', 'device', 'ip', 'process', 'network'].map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-2.5 py-1 rounded text-[11px] uppercase font-mono transition-colors cursor-pointer ${
                  filterType === t
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-1">
            <button
              onClick={() => setZoomLevel((z) => Math.min(z + 0.15, 1.6))}
              className="p-1 hover:text-white text-slate-400 cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel((z) => Math.max(z - 0.15, 0.7))}
              className="p-1 hover:text-white text-slate-400 cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="p-1 hover:text-white text-slate-400 cursor-pointer"
              title="Reset Zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Canvas & Evidence Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Interactive SVG Graph Area */}
        <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-xl relative overflow-hidden h-[540px] shadow-inner">
          {/* Background grid pattern */}
          <div
            className="absolute inset-0 opacity-15"
            style={{
              backgroundImage: 'radial-gradient(circle, #38bdf8 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />

          <div
            className="w-full h-full transition-transform duration-200"
            style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
          >
            <svg className="w-full h-full pointer-events-none">
              <defs>
                <marker
                  id="arrow-suspicious"
                  viewBox="0 0 10 10"
                  refX="18"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#f43f5e" />
                </marker>
                <marker
                  id="arrow-normal"
                  viewBox="0 0 10 10"
                  refX="18"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
                </marker>
              </defs>

              {/* Render Relationships / Edges */}
              {edges.map((edge) => {
                const sourceNode = nodes.find((n) => n.id === edge.source);
                const targetNode = nodes.find((n) => n.id === edge.target);
                if (!sourceNode || !targetNode) return null;

                const isConnectedToSelected =
                  sourceNode.id === selectedNodeId || targetNode.id === selectedNodeId;

                return (
                  <g key={edge.id}>
                    <line
                      x1={sourceNode.x}
                      y1={sourceNode.y}
                      x2={targetNode.x}
                      y2={targetNode.y}
                      stroke={edge.isSuspicious ? '#f43f5e' : '#475569'}
                      strokeWidth={isConnectedToSelected ? 2.5 : 1.5}
                      strokeDasharray={edge.isSuspicious ? '4 3' : 'none'}
                      markerEnd={edge.isSuspicious ? 'url(#arrow-suspicious)' : 'url(#arrow-normal)'}
                      className={edge.isSuspicious ? 'animate-pulse' : ''}
                    />
                    {/* Edge Label */}
                    <text
                      x={(sourceNode.x + targetNode.x) / 2}
                      y={(sourceNode.y + targetNode.y) / 2 - 6}
                      fill={edge.isSuspicious ? '#fda4af' : '#94a3b8'}
                      fontSize="9"
                      textAnchor="middle"
                      className="font-mono select-none"
                    >
                      {edge.label}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Render Nodes as Interactive Cards */}
            {filteredNodes.map((node) => {
              const isSelected = selectedNodeId === node.id;
              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedNodeId(node.id)}
                  style={{ left: `${node.x - 90}px`, top: `${node.y - 35}px` }}
                  className={`absolute w-44 p-2.5 rounded-xl border transition-all cursor-pointer select-none shadow-lg ${
                    isSelected
                      ? 'bg-slate-900 border-cyan-400 ring-2 ring-cyan-500/50 shadow-cyan-950/80 scale-105 z-20'
                      : 'bg-slate-900/90 border-slate-700 hover:border-slate-500 z-10'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-1.5">
                      {getNodeIcon(node.type)}
                      <span className="text-[10px] uppercase font-mono font-bold text-slate-400">
                        {node.type}
                      </span>
                    </div>

                    <span
                      className={`w-2 h-2 rounded-full ${
                        node.risk === 'critical'
                          ? 'bg-rose-500 animate-ping'
                          : node.risk === 'high'
                          ? 'bg-orange-500'
                          : 'bg-cyan-400'
                      }`}
                    />
                  </div>

                  <div className="text-xs font-bold text-slate-200 truncate">{node.label}</div>
                  <div className="text-[10px] text-slate-400 truncate">{node.sublabel}</div>

                  <div className="mt-1.5 pt-1.5 border-t border-slate-800 flex items-center justify-between text-[9px] font-mono text-slate-400">
                    <span>{node.platform}</span>
                    <span className="text-cyan-400 font-semibold">{node.evidenceCount} alerts</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="absolute bottom-3 left-3 text-[10px] text-slate-500 font-mono">
            Click any entity node to inspect supporting evidence and trigger SOAR containment.
          </div>
        </div>

        {/* Selected Entity Evidence Dossier Side Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-start justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                {getNodeIcon(selectedNode.type)}
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase text-cyan-400 font-bold">
                  {selectedNode.type} Entity Dossier
                </div>
                <h3 className="text-sm font-bold text-white truncate max-w-[200px]">{selectedNode.label}</h3>
              </div>
            </div>

            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                selectedNode.risk === 'critical'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  : 'bg-orange-500/10 border-orange-500/30 text-orange-400'
              }`}
            >
              {selectedNode.risk} risk
            </span>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 block">Source Platform:</span>
              <span className="font-mono text-slate-200 font-medium">{selectedNode.platform}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 block">Role / Details:</span>
              <span className="font-mono text-cyan-300 font-medium truncate block">{selectedNode.sublabel}</span>
            </div>
          </div>

          {/* Supporting Evidence Items */}
          <div>
            <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
              <span>Supporting Telemetry Evidence:</span>
              <span className="text-[10px] text-slate-400 font-mono">
                {selectedNode.evidenceData.length} records
              </span>
            </div>

            <div className="space-y-2">
              {selectedNode.evidenceData.map((ev, i) => (
                <div key={i} className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 text-xs">
                  <div className="flex items-center gap-1.5 text-cyan-300 font-mono text-[11px] mb-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Evidence Record #{i + 1}</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed text-[11px]">{ev.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Gated SOAR Action for Selected Entity */}
          <div className="pt-3 border-t border-slate-800">
            <div className="text-xs font-semibold text-slate-300 mb-2">Recommended Entity Containment:</div>
            <button
              onClick={onOpenSwimlaneModal}
              className="w-full py-2.5 px-3 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/50 text-rose-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Contain &amp; Isolate via Swimlane SOAR</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
