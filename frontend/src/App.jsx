import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow, Background, Controls,
  applyEdgeChanges, applyNodeChanges,
  Handle, Position,
}
  from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import axios from 'axios';
import { Play, Save, Loader2, Sparkles, BrainCircuit, Bot, Database, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API = 'https://tech-assisment-2x4d.vercel.app/api';

function InputNode({ data }) {
  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="node-card" >
      <div className="node-title">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BrainCircuit size={16} color="#38bdf8" /> User Prompt
        </div>
        <Zap size={14} color="#818cf8" style={{ opacity: 0.6 }} />
      </div>

      <textarea
        className="node-input nodrag nowheel"
        placeholder="Type here..."
        value={data.prompt || ''}
        onChange={(e) => data.onChange(e.target.value)}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.target.focus()}
        style={{ cursor: 'text' }} />
      <Handle type="source" position={Position.Bottom} />
    </motion.div>
  );
}

function ResultNode({ data }) {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="node-card">
      <Handle type="target" position={Position.Top} />
      <div className="node-title">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bot size={16} color="#818cf8" /> AI Response
        </div>
      </div>

      <div className="node-result">
        <AnimatePresence mode="wait">
          {data.loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="loading-wrapper">
              <Loader2 className="spin" size={20} />
              <span>Thinking...</span>
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }} >
              {data.response || "Awaiting your prompt..."}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}



const nodeTypes = { input: InputNode, result: ResultNode };

const defaultNodes = [
  { id: '1', type: 'input', position: { x: 250, y: 50 }, data: { prompt: '', onChange: () => { } } },
  { id: '2', type: 'result', position: { x: 250, y: 350 }, data: { response: '', loading: false } },
];

const defaultEdges = [
  {
    id: 'e1-2',
    source: '1',
    target: '2',
    animated: true,
    style: { stroke: '#38bdf8', strokeWidth: 3, filter: 'drop-shadow(0 0 8px rgba(56, 189, 248, 0.4))' }
  },
];

export default function App() {
  const [nodes, setNodes] = useState(defaultNodes);
  const [edges, setEdges] = useState(defaultEdges);
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const onNodesChange = useCallback((c) => setNodes((n) => applyNodeChanges(c, n)), []);
  const onEdgesChange = useCallback((c) => setEdges((e) => applyEdgeChanges(c, e)), []);

  const updateNode = useCallback((id, newData) => {
    setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...newData } } : n)));
  }, []);

  useEffect(() => {
    updateNode('1', {
      onChange: (val) => {
        setPrompt(val);
        updateNode('1', { prompt: val });
      },
    });
  }, [updateNode]);

  const runFlow = async () => {
    if (!prompt.trim()) return alert('Please provide a prompt first.');

    setLoading(true);
    updateNode('2', { loading: true, response: '' });

    try {
      const { data } = await axios.post(`${API}/ask-ai`, { prompt });
      setResponse(data.response);
      updateNode('2', { response: data.response, loading: false });
    } catch (err) {
      alert(err.response?.data?.error || 'Connection to AI failed.');
      updateNode('2', { loading: false });
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!response) return alert('Generate a response before saving.');
    try {
      await axios.post(`${API}/save`, { prompt, response });
      alert('Interaction saved to MongoDB!');
    } catch {
      alert('Save operation failed.');
    }
  };

  return (
    <div className="app-container">
      <motion.header
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 100 }}
        className="header">
        <div className="header-title">
          <Sparkles size={26} color="#38bdf8" />
          <span>AI Flow Studio</span>
        </div>

        <div className="btn-group">
          <button className="btn btn-save" onClick={save} disabled={loading}>
            <Database size={18} /> Save
          </button>
          <button className="btn btn-run" onClick={runFlow} disabled={loading}>
            {loading ? <Loader2 className="spin" size={18} /> : <Play size={18} />}
            Run Flow
          </button>
        </div>
      </motion.header>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="flow-container">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          panOnScroll
          selectionOnDrag>
          <Background
            color="#1e293b"
            variant="dots"
            gap={25}
            size={1.5}
            style={{ opacity: 0.4 }} />
          <Controls />
        </ReactFlow>
      </motion.div>
    </div>
  );
}