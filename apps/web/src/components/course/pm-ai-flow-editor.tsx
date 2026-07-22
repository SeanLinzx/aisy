'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
  Handle,
  Position,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { AiFlowGraph, AiFlowNode, AiFlowNodeType, AiInputMode } from '@/lib/pm-pipeline';
import { aiInputModeLabel } from '@/lib/ai-image-upload-detect';

const TYPE_EMOJI: Record<AiFlowNodeType, string> = {
  text: '📝',
  image: '🖼️',
  video: '🎬',
};

function AiFlowNodeView({ data, selected }: { data: AiFlowNode; selected?: boolean }) {
  return (
    <div
      className={`rounded-xl border-2 bg-white px-3 py-2 min-w-[160px] shadow-sm ${
        selected ? 'border-violet-500 ring-2 ring-violet-200' : 'border-orange-200'
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-violet-400 !w-2 !h-2" />
      <div className="font-extrabold text-sm">
        {TYPE_EMOJI[data.type]} {data.label || '未命名'}
      </div>
      <div className="text-[10px] text-ink-soft mt-0.5">{data.type === 'text' ? '生文' : data.type === 'image' ? '生图' : '生视频'}</div>
      <Handle type="source" position={Position.Bottom} className="!bg-violet-400 !w-2 !h-2" />
    </div>
  );
}

const nodeTypes = { aiFlow: AiFlowNodeView };

function toFlowNodes(nodes: AiFlowNode[]): Node[] {
  return nodes.map((n) => ({
    id: n.id,
    type: 'aiFlow',
    position: n.position,
    data: n as unknown as Record<string, unknown>,
  }));
}

function toFlowEdges(edges: AiFlowGraph['edges']): Edge[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    markerEnd: { type: MarkerType.ArrowClosed },
  }));
}

function fromFlowNodes(nodes: Node[]): AiFlowNode[] {
  return nodes.map((n) => n.data as unknown as AiFlowNode);
}

function fromFlowEdges(edges: Edge[]): AiFlowGraph['edges'] {
  return edges.map((e) => ({ id: e.id, source: e.source, target: e.target }));
}

let nodeSeq = 0;

export function PmAiFlowEditor({
  value,
  onChange,
}: {
  value: AiFlowGraph;
  onChange: (next: AiFlowGraph) => void;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState(toFlowNodes(value.nodes));
  const [edges, setEdges, onEdgesChange] = useEdgesState(toFlowEdges(value.edges));
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedNode = useMemo(
    () => (selectedId ? (nodes.find((n) => n.id === selectedId)?.data as unknown as AiFlowNode | undefined) : undefined),
    [nodes, selectedId],
  );

  const emitChange = useCallback(
    (nextNodes: Node[], nextEdges: Edge[]) => {
      onChange({
        ...value,
        nodes: fromFlowNodes(nextNodes),
        edges: fromFlowEdges(nextEdges),
        mode: 'dag',
      });
    },
    [onChange, value],
  );

  const onConnect = useCallback(
    (conn: Connection) => {
      setEdges((eds) => {
        const next = addEdge({ ...conn, markerEnd: { type: MarkerType.ArrowClosed } }, eds);
        emitChange(nodes, next);
        return next;
      });
    },
    [emitChange, nodes, setEdges],
  );

  function addNode(type: AiFlowNodeType) {
    nodeSeq += 1;
    const id = `ai-${nodeSeq}`;
    const newNode: AiFlowNode = {
      id,
      type,
      inputMode: 'text',
      label: `节点 ${nodeSeq}`,
      inputDesc: '',
      outputDesc: '',
      position: { x: 80 + (nodes.length % 3) * 200, y: 60 + Math.floor(nodes.length / 3) * 120 },
    };
    const nextNodes = [...nodes, { id, type: 'aiFlow', position: newNode.position, data: newNode as unknown as Record<string, unknown> }];
    setNodes(nextNodes);
    emitChange(nextNodes, edges);
    setSelectedId(id);
  }

  function updateSelected(patch: Partial<AiFlowNode>) {
    if (!selectedId) return;
    const nextNodes = nodes.map((n) =>
      n.id === selectedId ? { ...n, data: { ...(n.data as unknown as AiFlowNode), ...patch } as Record<string, unknown> } : n,
    );
    setNodes(nextNodes);
    emitChange(nextNodes, edges);
  }

  function removeSelected() {
    if (!selectedId) return;
    const nextNodes = nodes.filter((n) => n.id !== selectedId);
    const nextEdges = edges.filter((e) => e.source !== selectedId && e.target !== selectedId);
    setNodes(nextNodes);
    setEdges(nextEdges);
    emitChange(nextNodes, nextEdges);
    setSelectedId(null);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" className="kid-button-ghost !py-1.5 !px-3 text-xs" onClick={() => addNode('text')}>
          + 生文 AI
        </button>
        <button type="button" className="kid-button-ghost !py-1.5 !px-3 text-xs" onClick={() => addNode('image')}>
          + 生图 AI
        </button>
        <button type="button" className="kid-button-ghost !py-1.5 !px-3 text-xs" onClick={() => addNode('video')}>
          + 生视频 AI
        </button>
        {selectedId && (
          <button type="button" className="kid-button-ghost !py-1.5 !px-3 text-xs text-rose-600" onClick={removeSelected}>
            删除选中节点
          </button>
        )}
      </div>
      <p className="text-xs text-ink-soft">
        从节点下方圆点拖到另一个节点上方圆点即可连线。流程不能有环，可以有分支和合并。
      </p>
      <div className="grid lg:grid-cols-[1fr_260px] gap-3">
        <div className="h-[420px] rounded-2xl border-2 border-orange-100 overflow-hidden bg-slate-50">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onNodeClick={(_, n) => setSelectedId(n.id)}
            onPaneClick={() => setSelectedId(null)}
            onNodeDragStop={(_, n) => {
              const nextNodes = nodes.map((node) => (node.id === n.id ? n : node));
              setNodes(nextNodes);
              emitChange(nextNodes, edges);
            }}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>
        <div className="kid-card-purple space-y-2 !p-4">
          <div className="text-sm font-extrabold">节点配置</div>
          {!selectedNode ? (
            <p className="text-xs text-ink-soft">点击左侧节点进行配置</p>
          ) : (
            <>
              <label className="text-xs font-bold block">
                名称
                <input
                  className="kid-input !py-1.5 text-sm mt-1 w-full"
                  value={selectedNode.label}
                  onChange={(e) => updateSelected({ label: e.target.value })}
                />
              </label>
              <label className="text-xs font-bold block">
                输入方式
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {(['text', 'image'] as AiInputMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => updateSelected({ inputMode: mode })}
                      className={`text-[11px] px-2 py-1 rounded-lg border font-bold ${
                        (selectedNode.inputMode ?? 'text') === mode
                          ? 'border-sky-500 bg-sky-50 text-sky-800'
                          : 'border-orange-100 bg-white'
                      }`}
                    >
                      {aiInputModeLabel(selectedNode.type, mode)}
                    </button>
                  ))}
                </div>
                {(selectedNode.inputMode ?? 'text') === 'image' && (
                  <p className="text-[10px] text-sky-700 font-semibold mt-1">
                    生成时会自动加入图片上传区
                  </p>
                )}
              </label>
              <label className="text-xs font-bold block">
                输入说明
                <textarea
                  className="kid-textarea !min-h-[56px] text-sm mt-1"
                  value={selectedNode.inputDesc}
                  onChange={(e) => updateSelected({ inputDesc: e.target.value })}
                  placeholder="这个 AI 接收什么？"
                />
              </label>
              <label className="text-xs font-bold block">
                输出说明
                <textarea
                  className="kid-textarea !min-h-[56px] text-sm mt-1"
                  value={selectedNode.outputDesc}
                  onChange={(e) => updateSelected({ outputDesc: e.target.value })}
                  placeholder="这个 AI 产出什么？"
                />
              </label>
              <label className="text-xs font-bold block">
                系统提示词 / 风格（可选）
                <textarea
                  className="kid-textarea !min-h-[48px] text-sm mt-1"
                  value={selectedNode.systemPrompt || ''}
                  onChange={(e) => updateSelected({ systemPrompt: e.target.value })}
                />
              </label>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
