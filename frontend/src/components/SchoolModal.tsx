import type { JSX } from "react";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, Loader2, MapPin, MessageCircle, Sparkles, X } from "lucide-react";
import {
  addSchoolOpinion,
  deleteSchoolOpinion,
  getSchoolDetails,
  getSchoolOpinions,
  updateSchoolOpinion,
} from "../api/schools";
import type { Opinion, SchoolDetails, SchoolSummary } from "../types";
import { MAP_UNLOCK_RADIUS_METERS } from "../utils/constants";

interface SchoolModalProps {
  school: SchoolSummary | null;
  onClose: () => void;
  onUnlock: (schoolId: string) => Promise<void>;
  onLike: (schoolId: string) => Promise<void>;
  onUnlike: (schoolId: string) => Promise<void>;
  isLiked: boolean;
  isUnlocked: boolean;
  currentUserId?: string;
}

interface PaginationState {
  page: number;
  total: number;
}

interface SchoolModalContentProps {
  school: SchoolSummary;
  details: SchoolDetails | null;
  isLoadingDetails: boolean;
  opinions: Opinion[];
  pagination: PaginationState;
  commentDraft: string;
  isBusy: boolean;
  isLiked: boolean;
  isUnlocked: boolean;
  allowUnlock: boolean;
  error: string | null;
  editingOpinionId: string | null;
  onClose: () => void;
  onLikeToggle: () => void;
  onUnlock: () => void;
  onCommentChange: (value: string) => void;
  onSubmitComment: () => void;
  onLoadMore: () => void;
  onEditOpinion: (opinion: Opinion) => void;
  onDeleteOpinion: (opinionId: string) => void;
  isOwner: (opinion: Opinion) => boolean;
}

const SchoolModalContent = ({
  school,
  details,
  isLoadingDetails,
  opinions,
  pagination,
  commentDraft,
  isBusy,
  isLiked,
  isUnlocked,
  allowUnlock,
  error,
  editingOpinionId,
  onClose,
  onLikeToggle,
  onUnlock,
  onCommentChange,
  onSubmitComment,
  onLoadMore,
  onEditOpinion,
  onDeleteOpinion,
  isOwner,
}: SchoolModalContentProps) => {
  const renderDetailsSection = (): JSX.Element => {
    if (isLoadingDetails) {
      return (
        <div className="flex flex-1 items-center justify-center text-slate-400">
          <Loader2 className="size-6 animate-spin" />
        </div>
      );
    }

    if (!details) {
      return <div className="text-sm text-slate-400">Brak dodatkowych informacji o tej szkole.</div>;
    }

    return (
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto pr-2 text-sm text-slate-600">
        <p>{details.description ?? "Brak opisu."}</p>
        {details.examStats && (
          <div className="rounded-2xl bg-slate-50 p-4">
            <h4 className="text-sm font-semibold text-slate-700">Wyniki egzaminów</h4>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {Object.entries(details.examStats).map(([label, value]) => (
                <div key={label} className="rounded-xl bg-white p-3 shadow">
                  <span className="text-xs uppercase tracking-wide text-slate-400">{label}</span>
                  <p className="text-base font-semibold text-slate-700">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        {details.tags && details.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {details.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-600">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderOpinionsSection = (): JSX.Element => (
    <div className="flex-1 space-y-3 overflow-y-auto p-4 pr-3 text-sm">
      {opinions.length === 0 ? (
        <p className="text-slate-400">Brak opinii. Bądź pierwszą osobą, która ją doda!</p>
      ) : (
        opinions.map((opinion) => (
          <div key={opinion._id} className="rounded-2xl bg-white p-3 shadow">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">{opinion.userName}</span>
              <span className="text-xs text-slate-400">{new Date(opinion.createdAt).toLocaleString()}</span>
            </div>
            <p className="mt-2 text-slate-600">{opinion.message}</p>
            {isOwner(opinion) && (
              <div className="mt-3 flex gap-2 text-xs font-semibold text-sky-500">
                <button onClick={() => onEditOpinion(opinion)} className="hover:text-sky-600">
                  Edytuj
                </button>
                <button onClick={() => onDeleteOpinion(opinion._id)} className="text-rose-500 hover:text-rose-600">
                  Usuń
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );

  return (
    <motion.div
      key={school._id}
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="relative flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
      >
        <button
          className="absolute right-4 top-4 z-10 rounded-full bg-white/90 p-2 text-slate-500 shadow hover:text-slate-700"
          onClick={onClose}
        >
          <X className="size-5" />
        </button>
        <div className="relative h-48 w-full bg-linear-to-br from-sky-500 via-sky-400 to-sky-600">
          <div className="absolute inset-0 bg-white/10" />
          <div className="absolute bottom-4 left-6 flex flex-col gap-2 text-white">
            <h2 className="text-2xl font-bold">{school.name}</h2>
            {school.distanceMeters && (
              <span className="flex items-center gap-2 text-sm font-semibold">
                <MapPin className="size-4" />
                {Math.round(school.distanceMeters)} m
              </span>
            )}
            <div className="flex gap-3">
              <button
                onClick={onLikeToggle}
                className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold shadow transition ${
                  isLiked ? "bg-white/20 text-white" : "bg-white text-sky-600"
                }`}
              >
                <Heart className={`size-4 ${isLiked ? "fill-current" : ""}`} />
                {isLiked ? "Polubiono" : "Polub"}
              </button>
              <button
                disabled={!allowUnlock || isUnlocked}
                onClick={onUnlock}
                className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold shadow transition ${
                  isUnlocked
                    ? "bg-amber-100 text-amber-600"
                    : allowUnlock
                    ? "bg-amber-400 text-amber-950 hover:bg-amber-300"
                    : "bg-white/40 text-white/70"
                }`}
              >
                <Sparkles className="size-4" />
                {isUnlocked ? "Odblokowano" : "Odblokuj"}
              </button>
            </div>
          </div>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-6 overflow-hidden p-6 md:grid-cols-[1.4fr_1fr]">
          <div className="flex h-full flex-col gap-4 overflow-hidden">
            <h3 className="text-lg font-semibold text-slate-700">Szczegóły szkoły</h3>
            {renderDetailsSection()}
          </div>

          <div className="flex h-full flex-col gap-4 overflow-hidden">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-700">
              <MessageCircle className="size-5 text-sky-500" />
              Opinie
            </h3>
            <div className="flex flex-1 flex-col overflow-hidden rounded-2xl bg-slate-50">
              {renderOpinionsSection()}
              {pagination.total > opinions.length && (
                <button
                  onClick={onLoadMore}
                  className="m-4 rounded-full bg-white px-4 py-2 text-sm font-semibold text-sky-600 shadow hover:bg-sky-50"
                >
                  Załaduj więcej
                </button>
              )}
              <div className="border-t border-slate-200 bg-white p-4">
                <textarea
                  className="h-24 w-full resize-none rounded-2xl border border-slate-200 p-3 text-sm focus:border-sky-400 focus:outline-none"
                  placeholder="Podziel się swoją opinią..."
                  value={commentDraft}
                  onChange={(event) => onCommentChange(event.target.value)}
                />
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={onSubmitComment}
                    disabled={isBusy || commentDraft.trim().length === 0}
                    className="flex items-center gap-2 rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-sky-300"
                  >
                    {isBusy ? <Loader2 className="size-4 animate-spin" /> : <MessageCircle className="size-4" />}
                    {editingOpinionId ? "Zapisz zmiany" : "Dodaj opinię"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        {error && (
          <div className="m-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">{error}</div>
        )}
      </motion.div>
    </motion.div>
  );
};

const SchoolModal = ({
  school,
  onClose,
  onUnlock,
  onLike,
  onUnlike,
  isLiked,
  isUnlocked,
  currentUserId,
}: SchoolModalProps) => {
  const [details, setDetails] = useState<SchoolDetails | null>(null);
  const [opinions, setOpinions] = useState<Opinion[]>([]);
  const [pagination, setPagination] = useState<PaginationState>({ page: 1, total: 0 });
  const [commentDraft, setCommentDraft] = useState("");
  const [editingOpinionId, setEditingOpinionId] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!school) {
      setDetails(null);
      setOpinions([]);
      setPagination({ page: 1, total: 0 });
      setCommentDraft("");
      setEditingOpinionId(null);
      setError(null);
      return;
    }

    const load = async () => {
      setIsLoadingDetails(true);
      try {
        const [schoolDetails, opinionsResponse] = await Promise.all([
          getSchoolDetails(school._id),
          getSchoolOpinions(school._id, 1),
        ]);
        setDetails(schoolDetails);
        setOpinions(opinionsResponse.opinions);
        setPagination({ page: opinionsResponse.page, total: opinionsResponse.total });
      } catch (err) {
        console.error("Nie udało się pobrać danych szkoły", err);
        setError("Ups! Nie udało się wczytać informacji o tej szkole.");
      } finally {
        setIsLoadingDetails(false);
      }
    };

    load();
  }, [school]);

  const allowUnlock = useMemo(
    () => Boolean(school?.distanceMeters && school.distanceMeters <= MAP_UNLOCK_RADIUS_METERS),
    [school]
  );

  const handleOpinionSubmit = async () => {
    if (!school || !commentDraft.trim()) return;
    setIsBusy(true);
    try {
      if (editingOpinionId) {
        const updated = await updateSchoolOpinion(school._id, editingOpinionId, commentDraft.trim());
        setOpinions((prev: Opinion[]) => prev.map((item: Opinion) => (item._id === updated._id ? updated : item)));
        setEditingOpinionId(null);
      } else {
        const created = await addSchoolOpinion(school._id, commentDraft.trim());
        setOpinions((prev: Opinion[]) => [created, ...prev]);
        setPagination((prev: PaginationState) => ({ ...prev, total: prev.total + 1 }));
      }
      setCommentDraft("");
    } catch (err) {
      console.error("Nie udało się zapisać opinii", err);
      setError("Nie udało się zapisać opinii. Spróbuj ponownie.");
    } finally {
      setIsBusy(false);
    }
  };

  const handleDeleteOpinion = async (opinionId: string) => {
    if (!school) return;
    setIsBusy(true);
    try {
      await deleteSchoolOpinion(school._id, opinionId);
      setOpinions((prev: Opinion[]) => prev.filter((item: Opinion) => item._id !== opinionId));
      setPagination((prev: PaginationState) => ({ ...prev, total: Math.max(prev.total - 1, 0) }));
    } catch (err) {
      console.error("Nie udało się usunąć opinii", err);
      setError("Nie udało się usunąć opinii. Spróbuj ponownie.");
    } finally {
      setIsBusy(false);
    }
  };

  const handleLoadMore = async () => {
    if (!school) return;
    const nextPage = pagination.page + 1;
    try {
      const response = await getSchoolOpinions(school._id, nextPage);
      setOpinions((prev: Opinion[]) => [...prev, ...response.opinions]);
      setPagination({ page: response.page, total: response.total });
    } catch (err) {
      console.error("Nie udało się pobrać kolejnych opinii", err);
      setError("Nie udało się pobrać kolejnych opinii.");
    }
  };

  const handleUnlock = async () => {
    if (!school) return;
    try {
      await onUnlock(school._id);
    } catch (err) {
      console.error("Odblokowanie szkoły nie powiodło się", err);
      const message = err instanceof Error ? err.message : "Odblokowanie szkoły nie powiodło się. Spróbuj ponownie.";
      setError(message);
    }
  };

  const handleLikeToggle = async () => {
    if (!school) return;
    try {
      if (isLiked) {
        await onUnlike(school._id);
      } else {
        await onLike(school._id);
      }
    } catch (err) {
      console.error("Nie udało się zmienić statusu polubienia", err);
      const message =
        err instanceof Error ? err.message : "Nie udało się zmienić statusu polubienia. Spróbuj ponownie.";
      setError(message);
    }
  };

  const handleEditOpinion = (opinion: Opinion) => {
    setEditingOpinionId(opinion._id);
    setCommentDraft(opinion.message);
  };

  const isOwner = (opinion: Opinion) => opinion.userId === currentUserId;

  return (
    <AnimatePresence>
      {school ? (
        <SchoolModalContent
          school={school}
          details={details}
          isLoadingDetails={isLoadingDetails}
          opinions={opinions}
          pagination={pagination}
          commentDraft={commentDraft}
          isBusy={isBusy}
          isLiked={isLiked}
          isUnlocked={isUnlocked}
          allowUnlock={allowUnlock}
          error={error}
          editingOpinionId={editingOpinionId}
          onClose={onClose}
          onLikeToggle={handleLikeToggle}
          onUnlock={handleUnlock}
          onCommentChange={setCommentDraft}
          onSubmitComment={handleOpinionSubmit}
          onLoadMore={handleLoadMore}
          onEditOpinion={handleEditOpinion}
          onDeleteOpinion={handleDeleteOpinion}
          isOwner={isOwner}
        />
      ) : null}
    </AnimatePresence>
  );
};

export default SchoolModal;
