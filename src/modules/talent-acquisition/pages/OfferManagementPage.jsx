import { useState } from 'react';
import { FileText, Plus, RefreshCw, Search } from 'lucide-react';
import PageHeader from '../../../shared/components/PageHeader.jsx';
import Button from '../../../shared/components/Button.jsx';
import ConfirmDialog from '../../../shared/components/ConfirmDialog.jsx';
import { useToast } from '../../../shared/components/Toast.jsx';
import OfferTable from '../features/offers/components/OfferTable.jsx';
import OfferFormModal from '../features/offers/components/OfferFormModal.jsx';
import OfferLetterModal from '../features/offers/components/OfferLetterModal.jsx';
import useOffers from '../features/offers/hooks/useOffers.js';
import { OFFER_STATUS } from '../constants/offerStatus.js';
import '../styles/offers.css';

export default function OfferManagementPage() {
  const toast = useToast();
  const {
    visibleEntries,
    counts,
    eligibleApplications,
    statusFilter,
    setStatusFilter,
    search,
    setSearch,
    loading,
    error,
    actions,
    runAction,
  } = useOffers();

  const [formOpen, setFormOpen] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [previewEntry, setPreviewEntry] = useState(null);
  const [sendEntry, setSendEntry] = useState(null);
  const [responseEntry, setResponseEntry] = useState(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (values, offerId) => {
    setBusy(true);
    try {
      if (offerId) {
        await runAction(actions.updateOffer, offerId, values);
        toast.success('The draft offer was updated.');
      } else {
        await runAction(actions.createOffer, values);
        toast.success('The offer was created as a draft.');
      }
      setFormOpen(false);
      setEditEntry(null);
    } catch (actionError) {
      toast.error(actionError.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSend = async () => {
    if (!sendEntry) return;
    setBusy(true);
    try {
      await runAction(actions.sendOffer, sendEntry.offer.offerId);
      toast.success(
        `The offer was handed over to the configured email integration for ${sendEntry.candidate.fullName}.`
      );
      setSendEntry(null);
    } catch (actionError) {
      toast.error(actionError.message);
    } finally {
      setBusy(false);
    }
  };

  const handleResponse = async (response) => {
    if (!responseEntry) return;
    setBusy(true);
    try {
      await runAction(actions.recordOfferResponse, responseEntry.offer.offerId, { response });
      toast.success(
        `The ${response} response of ${responseEntry.candidate.fullName} was recorded.`
      );
      setResponseEntry(null);
    } catch (actionError) {
      toast.error(actionError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow="Ecometrix · Talent Acquisition"
        title="Offer Management"
        subtitle="Create the offer of an approved candidate, dispatch it through the configured integration and track the response of the candidate."
        actions={
          <>
            <Button variant="outline" icon={RefreshCw} onClick={() => window.location.reload()}>
              Refresh data
            </Button>
            <Button
              icon={Plus}
              onClick={() => {
                setEditEntry(null);
                setFormOpen(true);
              }}
            >
              Create Offer
            </Button>
          </>
        }
      />

      {error && (
        <div className="notice notice--error" role="alert">
          <div className="notice__body">{error}</div>
        </div>
      )}

      <div className="ta-interview-summary">
        <div className="ta-interview-summary__item">
          <span className="ta-interview-summary__label">Draft</span>
          <span className="ta-interview-summary__value">{counts.draft}</span>
        </div>
        <div className="ta-interview-summary__item">
          <span className="ta-interview-summary__label">Sent</span>
          <span className="ta-interview-summary__value">{counts.sent}</span>
        </div>
        <div className="ta-interview-summary__item">
          <span className="ta-interview-summary__label">Accepted</span>
          <span className="ta-interview-summary__value">{counts.accepted}</span>
        </div>
        <div className="ta-interview-summary__item">
          <span className="ta-interview-summary__label">Declined</span>
          <span className="ta-interview-summary__value">{counts.declined}</span>
        </div>
      </div>

      <div className="page-toolbar">
        <div className="search-box">
          <span className="search-box__icon">
            <Search size={16} aria-hidden="true" />
          </span>
          <input
            type="search"
            className="input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by candidate, designation or offer reference"
            aria-label="Search the offers"
          />
        </div>

        <div className="filters">
          <button
            type="button"
            className={`ta-filter-chip ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All <span className="ta-filter-chip__count">{counts.all}</span>
          </button>
          <button
            type="button"
            className={`ta-filter-chip ${statusFilter === OFFER_STATUS.DRAFT ? 'active' : ''}`}
            onClick={() => setStatusFilter(OFFER_STATUS.DRAFT)}
          >
            Draft <span className="ta-filter-chip__count">{counts.draft}</span>
          </button>
          <button
            type="button"
            className={`ta-filter-chip ${statusFilter === OFFER_STATUS.SENT ? 'active' : ''}`}
            onClick={() => setStatusFilter(OFFER_STATUS.SENT)}
          >
            Sent <span className="ta-filter-chip__count">{counts.sent}</span>
          </button>
          <button
            type="button"
            className={`ta-filter-chip ${statusFilter === OFFER_STATUS.ACCEPTED ? 'active' : ''}`}
            onClick={() => setStatusFilter(OFFER_STATUS.ACCEPTED)}
          >
            Accepted <span className="ta-filter-chip__count">{counts.accepted}</span>
          </button>
          <button
            type="button"
            className={`ta-filter-chip ${statusFilter === OFFER_STATUS.DECLINED ? 'active' : ''}`}
            onClick={() => setStatusFilter(OFFER_STATUS.DECLINED)}
          >
            Declined <span className="ta-filter-chip__count">{counts.declined}</span>
          </button>
        </div>
      </div>

      <OfferTable
        rows={visibleEntries}
        loading={loading}
        onEdit={(row) => {
          setEditEntry(row);
          setFormOpen(true);
        }}
        onPreview={setPreviewEntry}
        onSend={setSendEntry}
        onRecordResponse={setResponseEntry}
      />

      <OfferFormModal
        open={formOpen}
        offer={editEntry?.offer}
        eligibleApplications={eligibleApplications}
        loading={busy}
        onClose={() => {
          setFormOpen(false);
          setEditEntry(null);
        }}
        onSubmit={handleSubmit}
      />

      <OfferLetterModal
        open={Boolean(previewEntry)}
        entry={previewEntry}
        onClose={() => setPreviewEntry(null)}
      />

      <ConfirmDialog
        open={Boolean(sendEntry)}
        title="Send offer letter"
        confirmLabel="Send offer"
        variant="primary"
        message={
          sendEntry
            ? `The offer of ${sendEntry.candidate.fullName} will be handed over to the configured email integration. The delivery is recorded by the backend integration.`
            : 'The offer will be handed over to the configured email integration.'
        }
        onClose={() => setSendEntry(null)}
        onConfirm={handleSend}
        loading={busy}
      />

      <ConfirmDialog
        open={Boolean(responseEntry)}
        title="Record candidate response"
        confirmLabel="Accepted"
        variant="primary"
        message={
          responseEntry
            ? `Record the verified response of ${responseEntry.candidate.fullName}. Only record a response that was confirmed through the configured channel.`
            : 'Record the verified response of the candidate.'
        }
        onClose={() => setResponseEntry(null)}
        onConfirm={() => handleResponse('accepted')}
        loading={busy}
      >
        <button
          type="button"
          className="btn btn--danger btn--block"
          onClick={() => handleResponse('declined')}
          disabled={busy}
        >
          Record a declined response
        </button>
      </ConfirmDialog>

      {counts.all === 0 && !loading && (
        <p className="visually-hidden">
          <FileText size={14} aria-hidden="true" /> No offer has been created yet.
        </p>
      )}
    </div>
  );
}
