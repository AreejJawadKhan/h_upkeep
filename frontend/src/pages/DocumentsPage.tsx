import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, EmptyState, Field, Panel } from '../components/UI';
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
  const [upload, setUpload] = useState<UploadForm>(emptyUpload);

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
      setStatus('Document uploaded.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload document.');
    } finally {
      setUploading(false);
    }
  }

  async function remove(document: MaintenanceDocument) {
    if (!selectedHome || !selectedMaintenance) return;
    if (!window.confirm(`Delete ${document.file_name}?`)) return;

    try {
      await apiRequestWithRefresh<void>(
        `/homes/${selectedHome.id}/maintenance/${selectedMaintenance.id}/documents/${document.id}`,
        { method: 'DELETE' },
        () => accessToken,
        refreshSession,
      );
      await loadDocuments(selectedHome.id, selectedMaintenance.id);
      setStatus('Document deleted.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete document.');
    }
  }

  const documentCount = documents.length;
  const selectedRecordLabel = selectedMaintenance
    ? `${selectedMaintenance.title} · ${selectedMaintenance.category}`
    : 'No maintenance selected';

  return (
    <div className="homes-page">
      <div className="overview-row documents-overview">
        <div className="stat-card">
          <span>Documents</span>
          <strong>{documentCount}</strong>
        </div>
        <div className="stat-card">
          <span>Maintenance records</span>
          <strong>{records.length}</strong>
        </div>
        <div className="stat-card">
          <span>Selected record</span>
          <strong>{selectedMaintenance ? 'Ready' : 'None'}</strong>
        </div>
      </div>

      {error ? <div className="form-error">{error}</div> : null}
      {status ? <div className="success-banner">{status}</div> : null}

      <div className="workspace-grid">
        <aside className="workspace-sidebar">
          <Panel title="Upload document" eyebrow="Files">
            <form className="stacked-form" onSubmit={submit}>
              <Field
                label="File"
                hint="Upload a PDF, image, or Word document up to 15 MB."
              >
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
          </Panel>

          <Panel title="Homes" eyebrow="Choose a home">
            {loadingHomes ? (
              <div className="loading-state compact">
                <div className="spinner" />
                <p>Loading homes...</p>
              </div>
            ) : homes.length === 0 ? (
              <EmptyState
                title="No homes yet"
                description="Create a home first, then attach documents to its maintenance records."
              />
            ) : (
              <div className="home-list">
                {homes.map((home) => {
                  const active = String(home.id) === selectedHome?.id?.toString();
                  return (
                    <article key={home.id} className={`home-card ${active ? 'active' : ''}`}>
                      <button
                        type="button"
                        className="home-card-body"
                        onClick={() => setParams({ home: String(home.id) })}
                      >
                        <strong>{home.name}</strong>
                        <span>
                          {home.property_type} · {home.year_built}
                        </span>
                        <em>{home.address}</em>
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </Panel>

          <Panel title="Maintenance" eyebrow="Attach to a record">
            {loadingRecords ? (
              <div className="loading-state compact">
                <div className="spinner" />
                <p>Loading maintenance...</p>
              </div>
            ) : !selectedHome ? (
              <EmptyState title="No home selected" description="Choose a home to browse its maintenance records." />
            ) : records.length === 0 ? (
              <EmptyState
                title="No maintenance records yet"
                description="Create a maintenance record first so documents have a place to live."
              />
            ) : (
              <div className="item-list">
                {records.map((record) => {
                  const active = String(record.id) === selectedMaintenance?.id?.toString();
                  return (
                    <article key={record.id} className={`item-card document-record ${active ? 'active' : ''}`}>
                      <button
                        type="button"
                        className="home-card-body"
                        onClick={() => setParams({ home: String(selectedHome.id), maintenance: String(record.id) })}
                      >
                        <strong>{record.title}</strong>
                        <p>{record.item} · {record.category}</p>
                        <p className="muted-copy">{formatDate(record.date)}</p>
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </Panel>
        </aside>

        <section className="workspace-main">
          {selectedHome && selectedMaintenance ? (
            <>
              <Panel
                title={`${selectedHome.name} documents`}
                eyebrow="Selected maintenance"
                actions={<div className="meta-pill">{selectedRecordLabel}</div>}
              >
                <div className="home-detail">
                  <div>
                    <p className="detail-label">Documents attached</p>
                    <strong>{documents.length}</strong>
                  </div>
                  <div>
                    <p className="detail-label">Last updated</p>
                    <strong>{selectedMaintenance.updated_at ? formatDateTime(selectedMaintenance.updated_at) : '—'}</strong>
                  </div>
                </div>
              </Panel>

              <Panel title="Attached files" eyebrow="Receipts, photos, warranties">
                {loadingDocuments ? (
                  <div className="loading-state compact">
                    <div className="spinner" />
                    <p>Loading documents...</p>
                  </div>
                ) : documents.length === 0 ? (
                  <EmptyState
                    title="No documents yet"
                    description="Upload a receipt, photo, invoice, or warranty file for this maintenance record."
                  />
                ) : (
                  <div className="item-list">
                    {documents.map((document) => (
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
                          <button type="button" onClick={() => void remove(document)}>
                            Delete
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </Panel>
            </>
          ) : (
            <EmptyState
              title="No maintenance selected"
              description="Pick a home and maintenance record to attach documents."
            />
          )}
        </section>
      </div>
    </div>
  );
}
