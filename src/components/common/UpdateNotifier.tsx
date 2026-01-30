import React, { useEffect, useState } from 'react';
import { Download, RefreshCw, X } from 'lucide-react';
import './UpdateNotifier.css';

declare global {
    interface Window {
        electron: {
            onUpdateAvailable: (callback: (info: any) => void) => void;
            onUpdateDownloaded: (callback: (info: any) => void) => void;
            installUpdate: () => void;
            getAppVersion: () => Promise<string>;
        };
    }
}

export const UpdateNotifier: React.FC = () => {
    const [status, setStatus] = useState<'idle' | 'available' | 'downloaded'>('idle');
    const [versionInfo, setVersionInfo] = useState<any>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (!window.electron) return;

        window.electron.onUpdateAvailable((info) => {
            setVersionInfo(info);
            setStatus('available');
            setIsVisible(true);
        });

        window.electron.onUpdateDownloaded((info) => {
            setVersionInfo(info);
            setStatus('downloaded');
            setIsVisible(true);
        });
    }, []);

    const handleInstall = () => {
        window.electron.installUpdate();
    };

    const handleClose = () => {
        setIsVisible(false);
    };

    const isDownloaded = status === 'downloaded';

    if (!isVisible || status === 'idle') return null;

    return (
        <div className={`update-notifier ${isDownloaded ? 'downloaded' : 'available'}`}>
            <div className="update-content">
                <div className="update-icon">
                    {isDownloaded ? <RefreshCw className="animate-spin-slow" size={20} /> : <Download size={20} />}
                </div>
                <div className="update-text">
                    {isDownloaded ? (
                        <>
                            <span className="update-title">Update Ready to Install</span>
                            <span className="update-description">Version {versionInfo?.version} has been downloaded. Restart to apply.</span>
                        </>
                    ) : (
                        <>
                            <span className="update-title">New Update Available</span>
                            <span className="update-description">Downloading version {versionInfo?.version}...</span>
                        </>
                    )}
                </div>
                <div className="update-actions">
                    {isDownloaded && (
                        <button className="update-button primary" onClick={handleInstall}>
                            Restart Now
                        </button>
                    )}
                    <button className="update-button-close" onClick={handleClose}>
                        <X size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};
