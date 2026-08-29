import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, EmptyState, Field, Panel } from '../components/UI';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PageHeader } from '../components/PageHeader';
import { SlideOver } from '../components/SlideOver';
import { useAuth } from '../context/AuthContext';
import { apiRequestWithRefresh } from '../lib/api';
import { formatDate, formatDateTime } from '../lib/format';
import { parseHomeParam } from '../lib/routes';
import type { Home, MaintenanceDocument, MaintenanceRecord } from '../lib/types';

type UploadForm = {
  fileName: string;
  fileType: string;
  dataUrl: string;
  size: number;
};

const emptyUpload: UploadForm = {
  fileName: '',
  fileType: '',
  dataUrl: '',
  size: 0,
};

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Could not read the selected file.'));
    reader.readAsDataURL(file);
  });
}

export function DocumentsPage() {
  const { accessToken, refreshSession } = useAuth();
  const [params, setParams] = useSearchParams();
  const [homes, setHomes] = useState<Home[]>([]);
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [documents, setDocuments] = useState<MaintenanceDocument[]>([]);
  const [loadingHomes, setLoadingHomes] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [documentQuery, setDocumentQuery] = useState('');
  const [documentSort, setDocumentSort] = useState<'newest' | 'oldest' | 'name'>('newest');
  const [upload, setUpload] = useState<UploadForm>(emptyUpload);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MaintenanceDocument | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const selectedHomeId = parseHomeParam(params.get('home'));
  const selectedMaintenanceId = params.get('maintenance') ?? '';

  const selectedHome = useMemo(
    () => homes.find((home) => String(home.id) === selectedHomeId) ?? homes[0] ?? null,
    [homes, selectedHomeId],
  );
  const selectedMaintenance = useMemo(
    () => records.find((record) => String(record.id) === selectedMaintenanceId) ?? records[0] ?? null,
    [records, selectedMaintenanceId],
  );

  async function loadHomes() {
    setLoadingHomes(true);
    try {
      const data = await apiRequestWithRefresh<Home[]>(
        '/homes',
        {},
        () => accessToken,
        refreshSession,
      );
      setHomes(data);
      if (!selectedHomeId && data.length > 0) {
        setParams({ home: String(data[0].id) }, { replace: true });
      } else if (selectedHomeId && !data.some((home) => String(home.id) === selectedHomeId) && data.length > 0) {
        setParams({ home: String(data[0].id) }, { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load homes.');
    } finally {
      setLoadingHomes(false);
    }
  }

  async function loadMaintenance(homeId: number) {
    setLoadingRecords(true);
    try {
      const data = await apiRequestWithRefresh<MaintenanceRecord[]>(
        `/homes/${homeId}/maintenance`,
        {},
        () => accessToken,
        refreshSession,
      );
      setRecords(data);
      if (!selectedMaintenanceId && data.length > 0) {
        setParams({ home: String(homeId), maintenance: String(data[0].id) }, { replace: true });
      } else if (
        selectedMaintenanceId &&
        !data.some((record) => String(record.id) === selectedMaintenanceId) &&
        data.length > 0
      ) {
        setParams({ home: String(homeId), maintenance: String(data[0].id) }, { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load maintenance records.');
    } finally {
      setLoadingRecords(false);
    }
  }

  async function loadDocuments(homeId: number, maintenanceId: number) {
    setLoadingDocuments(true);
    setError('');
    try {
      const data = await apiRequestWithRefresh<MaintenanceDocument[]>(
        `/homes/${homeId}/maintenance/${maintenanceId}/documents`,
        {},
        () => accessToken,
        refreshSession,
      );
      setDocuments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load documents.');
    } finally {
      setLoadingDocuments(false);
    }
  }

  useEffect(() => {
    if (!accessToken) return;
    void loadHomes();
  }, [accessToken]);

  useEffect(() => {
    if (!selectedHome) {
      setRecords([]);
      setDocuments([]);
      return;
    }
    setRecords([]);
    setDocuments([]);
    void loadMaintenance(selectedHome.id);
  }, [selectedHome?.id, accessToken]);

  useEffect(() => {
    if (!selectedHome || !selectedMaintenance) {
      setDocuments([]);
      return;
    }
    void loadDocuments(selectedHome.id, selectedMaintenance.id);
  }, [selectedHome?.id, selectedMaintenance?.id, accessToken]);

  useEffect(() => {
    setUpload(emptyUpload);
  }, [selectedMaintenance?.id]);

  function openUploadDrawer() {
    setError('');
    setStatus('');
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
  }

  async function handleFileChange(file: File | null) {
    if (!file) {
      setUpload(emptyUpload);
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError('Files must be 15 MB or smaller.');
      setUpload(emptyUpload);
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setUpload({
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
        dataUrl,
        size: file.size,
      });
      setError('');
      setStatus('');
    } catch (err) {
      setUpload(emptyUpload);
      setError(err instanceof Error ? err.message : 'Could not read the selected file.');
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedHome || !selectedMaintenance) return;
    if (!upload.dataUrl) {
      setError('Choose a file before uploading.');
      return;
    }

    setUploading(true);
    setError('');
    setStatus('');

    try {
      await apiRequestWithRefresh<MaintenanceDocument>(
        `/homes/${selectedHome.id}/maintenance/${selectedMaintenance.id}/documents`,
        {
          method: 'POST',
          body: {
            file_name: upload.fileName,
            file_type: upload.fileType,
            data_url: upload.dataUrl,
          },
        },
        () => accessToken,
        refreshSession,
      );
      await loadDocuments(selectedHome.id, selectedMaintenance.id);
      setUpload(emptyUpload);
      closeDrawer();
      setStatus('Document uploaded.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload document.');
    } finally {
      setUploading(false);
    }
  }

  async function remove(document: MaintenanceDocument) {
    if (!selectedHome || !selectedMaintenance) return;
    const snapshot = documents;
    setDeletingId(document.id);
    setDocuments((current) => current.filter((item) => item.id !== document.id));
    try {
      await apiRequestWithRefresh<void>(
        `/homes/${selectedHome.id}/maintenance/${selectedMaintenance.id}/documents/${document.id}`,
        { method: 'DELETE' },
        () => accessToken,
        refreshSession,
      );
      setStatus('Document deleted.');
    } catch (err) {
      setDocuments(snapshot);
      setError(err instanceof Error ? err.message : 'Could not delete document.');
    } finally {
      setDeletingId(null);
    }
  }

  const documentCount = documents.length;
  const visibleDocuments = useMemo(() => {
    const query = documentQuery.trim().toLowerCase();
    const filtered = documents.filter((document) => {
      if (!query) return true;
      return [document.file_name, document.file_type].join(' ').toLowerCase().includes(query);
    });

    const sorted = [...filtered].sort((a, b) => {
      switch (documentSort) {
        case 'oldest':
          return a.created_at.localeCompare(b.created_at);
        case 'name':
          return a.file_name.localeCompare(b.file_name);
        case 'newest':
        default:
          return b.created_at.localeCompare(a.created_at);
      }
    });
    return sorted;
  }, [documentQuery, documentSort, documents]);

  const homeSelector = (
    <label className="toolbar-field">
      <span className="field-label">Home</span>
      <select
        className="input"
        value={selectedHomeId}
        onChange={(e) => setParams({ home: e.target.value }, { replace: true })}
        disabled={homes.length === 0}
      >
        <option value="">Select a home</option>
        {homes.map((home) => (
          <option key={home.id} value={home.id}>
            {home.name}
          </option>
        ))}
      </select>
    </label>
  );

  const maintenanceSelector = (
    <label className="toolbar-field">
      <span className="field-label">Maintenance</span>
      <select
        className="input"
        value={selectedMaintenanceId}
        onChange={(e) => setParams({ home: String(selectedHome?.id ?? ''), maintenance: e.target.value }, { replace: true })}
        disabled={!selectedHome || records.length === 0}
      >
        <option value="">Select a record</option>
        {records.map((record) => (
          <option key={record.id} value={record.id}>
            {record.title}
          </option>
        ))}
      </select>
    </label>
  );

  const hasDocuments = documents.length > 0;

  return (
    <div className="workspace-page documents-page">
      <PageHeader
        title="Documents"
        description="Keep receipts, manuals, photos, and warranty files with the record they belong to."
        actions={
          <>
            {homeSelector}
            <Button onClick={openUploadDrawer} disabled={!selectedMaintenance}>
              + Upload document
            </Button>
          </>
        }
        filters={
          <>
            {maintenanceSelector}
            <label className="toolbar-field">
              <span className="field-label">Search</span>
              <input
                className="input"
                value={documentQuery}
                onChange={(e) => setDocumentQuery(e.target.value)}
                placeholder="Search documents"
              />
            </label>
            <label className="toolbar-field">
              <span className="field-label">Sort</span>
              <select
                className="input"
                value={documentSort}
                onChange={(e) => setDocumentSort(e.target.value as typeof documentSort)}
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="name">File name</option>
              </select>
            </label>
          </>
        }
      />

      {hasDocuments ? (
        <div className="overview-row documents-overview">
          <div className="stat-card">
            <span>Documents</span>
            <strong>{documentCount}</strong>
          </div>
          <div className="stat-card">
            <span>Maintenance records</span>
            <strong>{records.length}</strong>
          </div>
        </div>
      ) : null}

      {error ? <div className="form-error">{error}</div> : null}
      {status ? <div className="success-banner">{status}</div> : null}

      {loadingHomes || loadingRecords ? (
        <Panel title="Documents">
          <div className="loading-state compact">
            <div className="spinner" />
            <p>Loading documents...</p>
          </div>
        </Panel>
      ) : !selectedHome ? (
        <EmptyState
          title="No homes yet"
          description="Create a home first, then attach documents to its maintenance records."
          action={<Button href="/app/homes">Go to My Home</Button>}
        />
      ) : records.length === 0 ? (
        <EmptyState
          title="No maintenance records yet"
          description="Documents must attach to a maintenance record. Create one first, then upload files here."
          action={<Button href="/app/maintenance">Go to Maintenance</Button>}
        />
      ) : (
        <Panel title="Attached files" className="page-section">
          {loadingDocuments ? (
            <div className="loading-state compact">
              <div className="spinner" />
              <p>Loading documents...</p>
            </div>
          ) : !hasDocuments ? (
            <EmptyState
              title="No documents yet"
              description="Upload a receipt, photo, invoice, or warranty file for this maintenance record."
            />
          ) : (
            <div className="item-list">
              {visibleDocuments.map((document) => (
                <article className="document-card" key={document.id}>
                  <div className="document-main">
                    <div>
                      <strong>{document.file_name}</strong>
                      <p>{document.file_type} · {formatDateTime(document.created_at)}</p>
                    </div>
                    <a className="document-link" href={document.cloudinary_url} target="_blank" rel="noreferrer">
                      Open file
                    </a>
                  </div>
                  <div className="item-actions">
                    <button type="button" onClick={() => setDeleteTarget(document)} disabled={deletingId === document.id}>
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </Panel>
      )}

      <SlideOver
        open={drawerOpen}
        title="Upload document"
        description="Attach a receipt, manual, photo, or warranty file to the selected maintenance record."
        onClose={closeDrawer}
      >
        <form className="stacked-form" onSubmit={submit}>
          <Field label="File" hint="Upload a PDF, image, or Word document up to 15 MB.">
            <input
              className="input"
              type="file"
              accept="image/*,application/pdf,.pdf,.doc,.docx"
              onChange={(e) => void handleFileChange(e.target.files?.[0] ?? null)}
            />
          </Field>
          {upload.fileName ? (
            <div className="document-dropzone">
              <strong>{upload.fileName}</strong>
              <span>{upload.fileType || 'Unknown type'}</span>
              <span>{Math.round(upload.size / 1024)} KB</span>
            </div>
          ) : (
            <div className="document-dropzone empty">
              <span>Choose a file to attach it to the selected maintenance record.</span>
            </div>
          )}
          <Button type="submit" disabled={uploading || !selectedMaintenance}>
            {uploading ? 'Uploading...' : 'Upload document'}
          </Button>
        </form>
      </SlideOver>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete document?"
        description={
          deleteTarget ? (
            <>
              <p>
                This will remove <strong>{deleteTarget.file_name}</strong> from the selected maintenance record.
              </p>
              <p>The file will no longer be linked in Hupkeep.</p>
            </>
          ) : null
        }
        confirmLabel="Delete document"
        destructive
        busy={deletingId !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          void remove(deleteTarget).finally(() => setDeleteTarget(null));
        }}
      />
    </div>
  );
}
