export interface Pod {
  name: string;
  namespace: string;
  status: string;
  image: string;
  createdAt: string;
  podIP: string;
  ports: { [key: string]: number };
  nodePort?: number;
}

export interface CreatePodRequest {
  name: string;
  image: string;
  jupyterPort: number;
}

export interface UpdatePodRequest {
  image: string;
  jupyterPort: number;
}

export interface PodTemplate {
  id: string;
  name: string;
  image: string;
  description: string;
  defaultPort: number;
  icon: string;
}

export const POD_TEMPLATES: PodTemplate[] = [
  {
    id: 'ubuntu',
    name: 'Ubuntu 22.04',
    image: 'ubuntu:22.04',
    description: 'Basit Ubuntu terminali - genel amaçlı kullanım',
    defaultPort: 8888,
    icon: '🐧'
  },
  {
    id: 'jupyter-minimal',
    name: 'Jupyter Minimal',
    image: 'jupyter/minimal-notebook:latest',
    description: 'Python + Jupyter Notebook - temel veri analizi',
    defaultPort: 8888,
    icon: '📓'
  },
  {
    id: 'jupyter-tensorflow',
    name: 'Jupyter TensorFlow',
    image: 'jupyter/tensorflow-notebook:latest',
    description: 'TensorFlow + Keras + Jupyter - derin öğrenme',
    defaultPort: 8888,
    icon: '🧠'
  },
  {
    id: 'jupyter-pytorch',
    name: 'Jupyter PyTorch',
    image: 'jupyter/pytorch-notebook:latest',
    description: 'PyTorch + Jupyter - makine öğrenmesi',
    defaultPort: 8888,
    icon: '🔥'
  }
];

export interface PodStatusUpdate {
  podName: string;
  status: string;
  podIP?: string;
  nodePort?: number;
}

export interface PodLogEntry {
  timestamp: string;
  message: string;
}
