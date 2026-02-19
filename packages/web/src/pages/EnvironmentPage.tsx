import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Loader, 
  Terminal, 
  Download, 
  Trash2,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  X,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';

interface LogModalProps {
  isOpen: boolean;
  title: string;
  logs: string[];
  isRunning: boolean;
  onClose: () => void;
}

function LogModal({ isOpen, title, logs, isRunning, onClose }: LogModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            {isRunning ? (
              <Loader className="w-5 h-5 animate-spin text-blue-500" />
            ) : (
              <FileText className="w-5 h-5 text-gray-500" />
            )}
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isRunning}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Logs */}
        <div className="flex-1 overflow-auto p-4 font-mono text-sm">
          <div className="bg-gray-900 text-gray-100 p-4 rounded">
            {logs.length === 0 ? (
              <div className="text-gray-400">等待输出...</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
            {isRunning && (
              <div className="flex items-center gap-2 mt-2 text-blue-400">
                <Loader className="w-4 h-4 animate-spin" />
                <span>执行中...</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            onClick={onClose}
            disabled={isRunning}
            className="w-full"
          >
            {isRunning ? '执行中...' : '关闭'}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface EnvironmentCheck {
  id: string;
  name: string;
  command: string;
  checkCommand: string; // 用于检测版本的命令
  installed: boolean;
  version?: string;
  description: string;
  installUrl: string;
  installCommands?: {
    mac?: string;
    linux?: string;
    windows?: string;
    // 支持不同 Linux 发行版的包管理器
    apk?: string;
    apt?: string;
    yum?: string;
    dnf?: string;
    pacman?: string;
    zypper?: string;
  };
  uninstallCommands?: {
    mac?: string;
    linux?: string;
    apk?: string;
    apt?: string;
    yum?: string;
    dnf?: string;
    pacman?: string;
    zypper?: string;
  };
  required: boolean;
}

const ENVIRONMENTS: Omit<EnvironmentCheck, 'installed' | 'version'>[] = [
  {
    id: 'node',
    name: 'Node.js',
    command: 'node',
    checkCommand: 'node --version',
    description: 'JavaScript 运行时，用于运行 npx 和 @modelcontextprotocol 官方服务',
    installUrl: 'https://nodejs.org',
    installCommands: {
      mac: 'brew install node',
      linux: 'curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - && sudo apt-get install -y nodejs',
      windows: 'winget install OpenJS.NodeJS.LTS',
      apk: 'apk add --no-cache nodejs npm',
      apt: 'curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - && sudo apt-get install -y nodejs',
      yum: 'curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash - && sudo yum install -y nodejs',
      dnf: 'curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash - && sudo dnf install -y nodejs',
      pacman: 'sudo pacman -S --noconfirm nodejs npm',
      zypper: 'sudo zypper install -y nodejs20',
    },
    uninstallCommands: {
      mac: 'brew uninstall node',
      apk: 'apk del nodejs npm',
      apt: 'sudo apt-get remove -y nodejs',
      yum: 'sudo yum remove -y nodejs',
      dnf: 'sudo dnf remove -y nodejs',
      pacman: 'sudo pacman -R --noconfirm nodejs npm',
      zypper: 'sudo zypper remove -y nodejs20',
    },
    required: true,
  },
  {
    id: 'npm',
    name: 'npm',
    command: 'npm',
    checkCommand: 'npm --version',
    description: 'Node.js 包管理器（随 Node.js 自动安装）',
    installUrl: 'https://nodejs.org',
    required: true,
  },
  {
    id: 'npx',
    name: 'npx',
    command: 'npx',
    checkCommand: 'npx --version',
    description: 'Node.js 包执行器（随 Node.js 自动安装），用于运行 MCP 服务',
    installUrl: 'https://nodejs.org',
    required: true,
  },
  {
    id: 'python3',
    name: 'Python 3',
    command: 'python3',
    checkCommand: 'python3 --version',
    description: 'Python 运行时，某些 MCP 服务需要',
    installUrl: 'https://python.org',
    installCommands: {
      mac: 'brew install python@3',
      linux: 'sudo apt-get update && sudo apt-get install -y python3 python3-pip',
      windows: 'winget install Python.Python.3.12',
      apk: 'apk add --no-cache python3 py3-pip',
      apt: 'sudo apt-get update && sudo apt-get install -y python3 python3-pip',
      yum: 'sudo yum install -y python3 python3-pip',
      dnf: 'sudo dnf install -y python3 python3-pip',
      pacman: 'sudo pacman -S --noconfirm python python-pip',
      zypper: 'sudo zypper install -y python3 python3-pip',
    },
    uninstallCommands: {
      mac: 'brew uninstall python@3',
      apk: 'apk del python3 py3-pip',
      apt: 'sudo apt-get remove -y python3 python3-pip',
      yum: 'sudo yum remove -y python3 python3-pip',
      dnf: 'sudo dnf remove -y python3 python3-pip',
      pacman: 'sudo pacman -R --noconfirm python python-pip',
      zypper: 'sudo zypper remove -y python3 python3-pip',
    },
    required: false,
  },
  {
    id: 'pip',
    name: 'pip',
    command: 'pip',
    checkCommand: 'pip --version',
    description: 'Python 包管理器（通常随 Python 安装）',
    installUrl: 'https://pip.pypa.io',
    installCommands: {
      mac: 'python3 -m ensurepip --upgrade',
      linux: 'sudo apt-get install -y python3-pip',
      windows: 'python -m ensurepip --upgrade',
      apk: 'apk add --no-cache py3-pip',
      apt: 'sudo apt-get install -y python3-pip',
      yum: 'sudo yum install -y python3-pip',
      dnf: 'sudo dnf install -y python3-pip',
      pacman: 'sudo pacman -S --noconfirm python-pip',
      zypper: 'sudo zypper install -y python3-pip',
    },
    required: false,
  },
  {
    id: 'uv',
    name: 'uv',
    command: 'uv',
    checkCommand: 'uv --version',
    description: 'Python 包管理器和执行器（Rust 实现，速度极快）',
    installUrl: 'https://docs.astral.sh/uv/',
    installCommands: {
      mac: 'curl -LsSf https://astral.sh/uv/install.sh | sh',
      linux: 'curl -LsSf https://astral.sh/uv/install.sh | sh',
      windows: 'powershell -c "irm https://astral.sh/uv/install.ps1 | iex"',
    },
    uninstallCommands: {
      mac: 'rm -rf ~/.cargo/bin/uv ~/.cargo/bin/uvx',
      linux: 'rm -rf ~/.cargo/bin/uv ~/.cargo/bin/uvx',
    },
    required: false,
  },
  {
    id: 'uvx',
    name: 'uvx',
    command: 'uvx',
    checkCommand: 'uvx --version',
    description: 'Python 包执行器（随 uv 安装），类似 npx',
    installUrl: 'https://docs.astral.sh/uv/',
    required: false,
  },
  {
    id: 'git',
    name: 'Git',
    command: 'git',
    checkCommand: 'git --version',
    description: '版本控制工具，某些安装方式需要',
    installUrl: 'https://git-scm.com',
    installCommands: {
      mac: 'brew install git',
      linux: 'sudo apt-get install -y git',
      windows: 'winget install Git.Git',
      apk: 'apk add --no-cache git',
      apt: 'sudo apt-get install -y git',
      yum: 'sudo yum install -y git',
      dnf: 'sudo dnf install -y git',
      pacman: 'sudo pacman -S --noconfirm git',
      zypper: 'sudo zypper install -y git',
    },
    uninstallCommands: {
      mac: 'brew uninstall git',
      apk: 'apk del git',
      apt: 'sudo apt-get remove -y git',
      yum: 'sudo yum remove -y git',
      dnf: 'sudo dnf remove -y git',
      pacman: 'sudo pacman -R --noconfirm git',
      zypper: 'sudo zypper remove -y git',
    },
    required: false,
  },
  {
    id: 'rust',
    name: 'Rust',
    command: 'rustc',
    checkCommand: 'rustc --version',
    description: 'Rust 编程语言，用于运行 Rust 编写的 MCP 服务',
    installUrl: 'https://www.rust-lang.org',
    installCommands: {
      mac: 'curl --proto \'=https\' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y',
      linux: 'curl --proto \'=https\' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y',
      windows: 'winget install Rustlang.Rustup',
    },
    uninstallCommands: {
      mac: 'rustup self uninstall -y',
      linux: 'rustup self uninstall -y',
    },
    required: false,
  },
  {
    id: 'cargo',
    name: 'Cargo',
    command: 'cargo',
    checkCommand: 'cargo --version',
    description: 'Rust 包管理器和构建工具（随 Rust 安装）',
    installUrl: 'https://www.rust-lang.org',
    required: false,
  },
  {
    id: 'java',
    name: 'Java',
    command: 'java',
    checkCommand: 'java -version',
    description: 'Java 运行时环境，用于运行 Java 编写的 MCP 服务',
    installUrl: 'https://www.oracle.com/java/',
    installCommands: {
      mac: 'brew install openjdk@17',
      linux: 'sudo apt-get update && sudo apt-get install -y openjdk-17-jdk',
      windows: 'winget install Oracle.JDK.17',
      apk: 'apk add --no-cache openjdk17',
      apt: 'sudo apt-get update && sudo apt-get install -y openjdk-17-jdk',
      yum: 'sudo yum install -y java-17-openjdk',
      dnf: 'sudo dnf install -y java-17-openjdk',
      pacman: 'sudo pacman -S --noconfirm jdk17-openjdk',
      zypper: 'sudo zypper install -y java-17-openjdk',
    },
    uninstallCommands: {
      mac: 'brew uninstall openjdk@17',
      apk: 'apk del openjdk17',
      apt: 'sudo apt-get remove -y openjdk-17-jdk',
      yum: 'sudo yum remove -y java-17-openjdk',
      dnf: 'sudo dnf remove -y java-17-openjdk',
      pacman: 'sudo pacman -R --noconfirm jdk17-openjdk',
      zypper: 'sudo zypper remove -y java-17-openjdk',
    },
    required: false,
  },
  {
    id: 'javac',
    name: 'Java 编译器',
    command: 'javac',
    checkCommand: 'javac -version',
    description: 'Java 编译器（随 JDK 安装）',
    installUrl: 'https://www.oracle.com/java/',
    required: false,
  },
  {
    id: 'go',
    name: 'Go',
    command: 'go',
    checkCommand: 'go version',
    description: 'Go 编程语言，用于运行 Go 编写的 MCP 服务',
    installUrl: 'https://go.dev',
    installCommands: {
      mac: 'brew install go',
      linux: 'sudo apt-get update && sudo apt-get install -y golang',
      windows: 'winget install GoLang.Go',
      apk: 'apk add --no-cache go',
      apt: 'sudo apt-get update && sudo apt-get install -y golang',
      yum: 'sudo yum install -y golang',
      dnf: 'sudo dnf install -y golang',
      pacman: 'sudo pacman -S --noconfirm go',
      zypper: 'sudo zypper install -y go',
    },
    uninstallCommands: {
      mac: 'brew uninstall go',
      apk: 'apk del go',
      apt: 'sudo apt-get remove -y golang',
      yum: 'sudo yum remove -y golang',
      dnf: 'sudo dnf remove -y golang',
      pacman: 'sudo pacman -R --noconfirm go',
      zypper: 'sudo zypper remove -y go',
    },
    required: false,
  },
];

export function EnvironmentPage() {
  const [environments, setEnvironments] = useState<EnvironmentCheck[]>([]);
  const [checking, setChecking] = useState(true);
  const [platform, setPlatform] = useState<'mac' | 'linux' | 'windows'>('mac');
  const [packageManager, setPackageManager] = useState<'apk' | 'apt' | 'yum' | 'dnf' | 'pacman' | 'zypper' | 'unknown'>('unknown');
  const [linuxDistro, setLinuxDistro] = useState<string>('');
  
  // 日志模态框状态
  const [logModal, setLogModal] = useState({
    isOpen: false,
    title: '',
    logs: [] as string[],
    isRunning: false,
  });

  useEffect(() => {
    // 检测平台
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('win')) {
      setPlatform('windows');
    } else if (userAgent.includes('linux')) {
      setPlatform('linux');
    } else {
      setPlatform('mac');
    }

    checkEnvironments();
  }, []);

  const checkEnvironments = async () => {
    setChecking(true);
    
    try {
      const response = await fetch('/api/environment/check');
      const data = await response.json();
      
      // 如果后端返回了 OS 信息，使用它
      if (data.os) {
        setPlatform(data.os);
      }
      
      // 如果是 Linux，设置发行版和包管理器信息
      if (data.os === 'linux' && data.linux) {
        setLinuxDistro(data.linux.distro);
        setPackageManager(data.linux.packageManager);
        console.log('Detected Linux distro:', data.linux.distro, 'Package manager:', data.linux.packageManager);
      }
      
      const checkedEnvs: EnvironmentCheck[] = ENVIRONMENTS.map(env => ({
        ...env,
        installed: data.environments?.[env.id]?.installed || false,
        version: data.environments?.[env.id]?.version,
      }));
      
      setEnvironments(checkedEnvs);
    } catch (error) {
      console.error('Failed to check environments:', error);
      toast.error('环境检测失败', {
        description: '无法连接到后端服务',
      });
      
      // 使用默认值
      const defaultEnvs: EnvironmentCheck[] = ENVIRONMENTS.map(env => ({
        ...env,
        installed: false,
      }));
      setEnvironments(defaultEnvs);
    } finally {
      setChecking(false);
    }
  };

  const handleInstall = async (env: EnvironmentCheck) => {
    // 优先使用包管理器特定的命令，然后回退到平台通用命令
    let command: string | undefined;
    
    if (platform === 'linux' && packageManager !== 'unknown' && env.installCommands?.[packageManager]) {
      command = env.installCommands[packageManager];
    } else {
      command = env.installCommands?.[platform];
    }
    
    if (!command) {
      const pmInfo = packageManager !== 'unknown' ? ` (${packageManager})` : '';
      toast.error('无法安装', {
        description: `当前平台 (${platform}${pmInfo}) 不支持自动安装，请访问官网手动安装`,
      });
      return;
    }

    // 打开日志模态框
    const pmInfo = packageManager !== 'unknown' ? ` [${packageManager}]` : '';
    setLogModal({
      isOpen: true,
      title: `正在安装 ${env.name}`,
      logs: [
        `平台：${platform}${pmInfo}`,
        linuxDistro ? `发行版：${linuxDistro}` : '',
        `命令：${command}`,
        '',
        '开始执行...',
      ].filter(Boolean),
      isRunning: true,
    });

    try {
      const response = await fetch('/api/environment/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: env.id,
          command,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // 显示错误日志
        setLogModal(prev => ({
          ...prev,
          logs: [
            ...prev.logs,
            '',
            '❌ 安装失败',
            '',
            ...(result.logs || result.details || result.error || '未知错误').split('\n'),
          ],
          isRunning: false,
        }));
        
        toast.error('安装失败', {
          description: result.error || '请查看日志了解详情',
          duration: 6000,
        });
        return;
      }

      // 显示成功日志
      setLogModal(prev => ({
        ...prev,
        logs: [
          ...prev.logs,
          '',
          '✅ 安装成功',
          '',
          ...(result.logs || result.output || '安装完成').split('\n'),
        ],
        isRunning: false,
      }));

      toast.success('安装完成', {
        description: `${env.name} 已成功安装`,
      });

      // 重新检测
      setTimeout(() => {
        checkEnvironments();
        // 3秒后自动关闭模态框
        setTimeout(() => {
          setLogModal(prev => ({ ...prev, isOpen: false }));
        }, 3000);
      }, 1000);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '请手动安装';
      
      setLogModal(prev => ({
        ...prev,
        logs: [
          ...prev.logs,
          '',
          '❌ 安装失败',
          '',
          errorMsg,
        ],
        isRunning: false,
      }));
      
      toast.error('安装失败', {
        description: errorMsg,
      });
    }
  };

  const handleUninstall = async (env: EnvironmentCheck) => {
    if (platform === 'windows') {
      toast.error('无法卸载', {
        description: '当前环境不支持自动卸载，请手动卸载',
      });
      return;
    }
    
    // 优先使用包管理器特定的命令，然后回退到平台通用命令
    let command: string | undefined;
    
    if (platform === 'linux' && packageManager !== 'unknown' && env.uninstallCommands?.[packageManager]) {
      command = env.uninstallCommands[packageManager];
    } else {
      command = env.uninstallCommands?.[platform];
    }
    
    if (!command) {
      toast.error('无法卸载', {
        description: '当前环境不支持自动卸载，请手动卸载',
      });
      return;
    }

    // 打开日志模态框
    const pmInfo = packageManager !== 'unknown' ? ` [${packageManager}]` : '';
    setLogModal({
      isOpen: true,
      title: `正在卸载 ${env.name}`,
      logs: [
        `平台：${platform}${pmInfo}`,
        linuxDistro ? `发行版：${linuxDistro}` : '',
        `命令：${command}`,
        '',
        '开始执行...',
      ].filter(Boolean),
      isRunning: true,
    });

    try {
      const response = await fetch('/api/environment/uninstall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: env.id,
          command,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setLogModal(prev => ({
          ...prev,
          logs: [
            ...prev.logs,
            '',
            '❌ 卸载失败',
            '',
            ...(result.logs || result.details || result.error || '未知错误').split('\n'),
          ],
          isRunning: false,
        }));
        
        toast.error('卸载失败', {
          description: result.error || '请查看日志了解详情',
          duration: 6000,
        });
        return;
      }

      setLogModal(prev => ({
        ...prev,
        logs: [
          ...prev.logs,
          '',
          '✅ 卸载成功',
          '',
          ...(result.logs || result.output || '卸载完成').split('\n'),
        ],
        isRunning: false,
      }));

      toast.success('卸载完成', {
        description: `${env.name} 已卸载`,
      });

      // 重新检测
      setTimeout(() => {
        checkEnvironments();
        setTimeout(() => {
          setLogModal(prev => ({ ...prev, isOpen: false }));
        }, 3000);
      }, 1000);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '请手动卸载';
      
      setLogModal(prev => ({
        ...prev,
        logs: [
          ...prev.logs,
          '',
          '❌ 卸载失败',
          '',
          errorMsg,
        ],
        isRunning: false,
      }));
      
      toast.error('卸载失败', {
        description: errorMsg,
      });
    }
  };

  const requiredCount = environments.filter(e => e.required).length;
  const requiredInstalled = environments.filter(e => e.required && e.installed).length;
  const optionalCount = environments.filter(e => !e.required).length;
  const optionalInstalled = environments.filter(e => !e.required && e.installed).length;

  return (
    <div className="space-y-6">
      {/* 顶部统计 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-500">必需环境</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {requiredInstalled}/{requiredCount}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                requiredInstalled === requiredCount 
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                  : 'bg-red-500/10 text-red-600 dark:text-red-400'
              }`}>
                {requiredInstalled === requiredCount ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  <AlertTriangle className="w-6 h-6" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-500">可选环境</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {optionalInstalled}/{optionalCount}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Terminal className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-500">当前平台</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {platform === 'mac' ? 'macOS' : platform === 'linux' ? 'Linux' : 'Windows'}
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={checkEnvironments}
                disabled={checking}
              >
                {checking ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 环境列表 */}
      <div className="space-y-3">
        {checking ? (
          <Card className="dark:bg-slate-900 dark:border-slate-800">
            <CardContent className="py-12 text-center">
              <Loader className="w-8 h-8 animate-spin mx-auto text-primary-500 mb-3" />
              <p className="text-sm text-gray-500 dark:text-slate-500">正在检测环境...</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* 必需环境 */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                必需环境
              </h3>
              <div className="space-y-2">
                {environments.filter(e => e.required).map(env => (
                  <Card 
                    key={env.id}
                    className={`dark:bg-slate-900 dark:border-slate-800 ${
                      env.installed ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-red-500'
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* 状态图标 */}
                        <div className="flex-shrink-0 mt-1">
                          {env.installed ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                          )}
                        </div>

                        {/* 环境信息 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                              {env.name}
                            </h4>
                            {env.version && (
                              <Badge className="text-[10px] bg-gray-500/10 text-gray-600 dark:text-slate-400">
                                {env.version}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-slate-500 mb-2">
                            {env.description}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] mb-2">
                            <code className="px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300">
                              {env.command}
                            </code>
                            <a
                              href={env.installUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                            >
                              官网
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                          {/* 推荐安装命令 */}
                          {!env.installed && (() => {
                            // 优先显示包管理器特定的命令
                            let command: string | undefined;
                            if (platform === 'linux' && packageManager !== 'unknown' && env.installCommands?.[packageManager]) {
                              command = env.installCommands[packageManager];
                            } else {
                              command = env.installCommands?.[platform];
                            }
                            
                            if (!command) return null;
                            
                            return (
                              <div className="flex items-start gap-2 text-[11px] bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded px-2 py-1.5">
                                <span className="text-blue-700 dark:text-blue-400 font-medium whitespace-nowrap">推荐:</span>
                                <code className="text-gray-700 dark:text-slate-300 break-all flex-1">
                                  {command}
                                </code>
                              </div>
                            );
                          })()}
                        </div>

                        {/* 操作按钮 */}
                        <div className="flex gap-2">
                          {!env.installed && (() => {
                            // 优先检查包管理器特定的命令
                            let hasCommand = false;
                            if (platform === 'linux' && packageManager !== 'unknown' && env.installCommands?.[packageManager]) {
                              hasCommand = true;
                            } else if (env.installCommands?.[platform]) {
                              hasCommand = true;
                            }
                            
                            if (!hasCommand) return null;
                            
                            return (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleInstall(env)}
                                className="gap-1"
                              >
                                <Download className="w-3.5 h-3.5" />
                                安装
                              </Button>
                            );
                          })()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* 可选环境 */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                可选环境
              </h3>
              <div className="space-y-2">
                {environments.filter(e => !e.required).map(env => (
                  <Card 
                    key={env.id}
                    className="dark:bg-slate-900 dark:border-slate-800"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* 状态图标 */}
                        <div className="flex-shrink-0 mt-1">
                          {env.installed ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <XCircle className="w-5 h-5 text-gray-400 dark:text-slate-600" />
                          )}
                        </div>

                        {/* 环境信息 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                              {env.name}
                            </h4>
                            {env.version && (
                              <Badge className="text-[10px] bg-gray-500/10 text-gray-600 dark:text-slate-400">
                                {env.version}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-slate-500 mb-2">
                            {env.description}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] mb-2">
                            <code className="px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300">
                              {env.command}
                            </code>
                            <a
                              href={env.installUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                            >
                              官网
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                          {/* 推荐安装命令 */}
                          {!env.installed && (() => {
                            // 优先显示包管理器特定的命令
                            let command: string | undefined;
                            if (platform === 'linux' && packageManager !== 'unknown' && env.installCommands?.[packageManager]) {
                              command = env.installCommands[packageManager];
                            } else {
                              command = env.installCommands?.[platform];
                            }
                            
                            if (!command) return null;
                            
                            return (
                              <div className="flex items-start gap-2 text-[11px] bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded px-2 py-1.5">
                                <span className="text-blue-700 dark:text-blue-400 font-medium whitespace-nowrap">推荐:</span>
                                <code className="text-gray-700 dark:text-slate-300 break-all flex-1">
                                  {command}
                                </code>
                              </div>
                            );
                          })()}
                        </div>

                        {/* 操作按钮 */}
                        <div className="flex gap-2">
                          {env.installed && platform !== 'windows' && (() => {
                            // 优先检查包管理器特定的命令
                            let hasCommand = false;
                            if (platform === 'linux' && packageManager !== 'unknown' && env.uninstallCommands?.[packageManager]) {
                              hasCommand = true;
                            } else if (env.uninstallCommands?.[platform]) {
                              hasCommand = true;
                            }
                            
                            if (!hasCommand) return null;
                            
                            return (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleUninstall(env)}
                                className="gap-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                卸载
                              </Button>
                            );
                          })()}
                          {!env.installed && (() => {
                            // 优先检查包管理器特定的命令
                            let hasCommand = false;
                            if (platform === 'linux' && packageManager !== 'unknown' && env.installCommands?.[packageManager]) {
                              hasCommand = true;
                            } else if (env.installCommands?.[platform]) {
                              hasCommand = true;
                            }
                            
                            if (!hasCommand) return null;
                            
                            return (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleInstall(env)}
                                className="gap-1"
                              >
                                <Download className="w-3.5 h-3.5" />
                                安装
                              </Button>
                            );
                          })()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* 底部说明 */}
      <Card className="dark:bg-slate-900 dark:border-slate-800 border-blue-500/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-gray-600 dark:text-slate-400 space-y-2">
              <p>
                <strong className="text-gray-900 dark:text-white">使用说明：</strong>
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>必需环境</strong>：Node.js 和 npm/npx 是运行 MCP 代理的基础要求</li>
                <li><strong>可选环境</strong>：根据您使用的 MCP 服务选择安装（如使用 Python 服务需要 Python）</li>
                <li><strong>uv/uvx</strong>：新一代 Python 包管理器，速度极快，推荐安装</li>
                <li><strong>一键安装</strong>：点击安装按钮执行自动安装脚本（需要管理员权限）</li>
                <li><strong>手动安装</strong>：如果自动安装失败，请访问官网手动安装</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 日志模态框 */}
      <LogModal
        isOpen={logModal.isOpen}
        title={logModal.title}
        logs={logModal.logs}
        isRunning={logModal.isRunning}
        onClose={() => setLogModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
