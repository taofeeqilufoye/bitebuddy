import { useEffect, useRef, useState } from "react";
import type { FormEvent, MouseEvent, ReactNode } from "react";
import {
  ApiError,
  createRestaurant,
  deleteRestaurant,
  fetchCuisines,
  fetchRestaurant,
  fetchRestaurants,
  fetchStarredRestaurants,
  setRestaurantStar,
  updateRestaurant,
} from "./api";
import type { CreateRestaurantInput, Cuisine, Restaurant } from "./api";
import {
  RESTAURANT_LIMITS,
  restaurantInputSchema,
  restaurantRatingInputSchema,
} from "../../server/validation";

type JournalRoute =
  | { page: "collection" }
  | { page: "starred" }
  | { page: "new" }
  | { page: "edit"; id: number }
  | { page: "detail"; id: number }
  | { page: "not-found" };

function routeFor(path: string): JournalRoute {
  if (path === "/" || path === "") return { page: "collection" };
  if (path === "/restaurants/starred") return { page: "starred" };
  if (path === "/restaurants/new") return { page: "new" };
  const editMatch = path.match(/^\/restaurants\/([1-9]\d*)\/edit$/);
  if (editMatch) {
    const id = Number(editMatch[1]);
    if (Number.isSafeInteger(id)) return { page: "edit", id };
  }
  const match = path.match(/^\/restaurants\/([1-9]\d*)$/);
  if (match) {
    const id = Number(match[1]);
    if (Number.isSafeInteger(id)) return { page: "detail", id };
  }
  return { page: "not-found" };
}

function Brand() {
  return (
    <a className="journal-brand" href="/" aria-label="BiteBuddy, your restaurant journal">
      <span className="brand-mark" aria-hidden="true" />
      <span>BiteBuddy</span>
      <span className="journal-brand-note">YOUR TABLE, REMEMBERED</span>
    </a>
  );
}

function JournalLink({
  href,
  onNavigate,
  className,
  children,
}: {
  href: string;
  onNavigate: (path: string) => void;
  className?: string;
  children: ReactNode;
}) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onNavigate(href);
  }
  return (
    <a className={className} href={href} onClick={handleClick}>
      {children}
    </a>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric", year: "numeric" }).format(date);
}

function Rating({ rating }: { rating: number | null }) {
  if (rating === null) return <span className="rating-unset">No rating yet</span>;
  return (
    <span className="rating-value">
      <span aria-hidden="true" className="rating-mark">/</span>
      {rating.toFixed(1)} <span className="rating-out-of">out of 5</span>
    </span>
  );
}

function StarToggleButton({
  restaurant,
  busy,
  disabled,
  className,
  describedBy,
  onToggle,
}: {
  restaurant: Restaurant;
  busy: boolean;
  disabled?: boolean;
  className: string;
  describedBy?: string;
  onToggle: () => void;
}) {
  const accessibleName = busy
    ? `Saving starred status for ${restaurant.name}`
    : restaurant.isStarred
      ? `Remove ${restaurant.name} from Starred`
      : `Add ${restaurant.name} to Starred`;

  return (
    <button
      className={className}
      type="button"
      aria-label={accessibleName}
      aria-pressed={restaurant.isStarred}
      aria-busy={busy}
      aria-describedby={describedBy}
      disabled={busy || disabled}
      onClick={onToggle}
    >
      {busy ? "Saving…" : restaurant.isStarred ? "Starred" : "Star"}
    </button>
  );
}

function RestaurantCard({
  restaurant,
  onNavigate,
  onToggleStar,
  starBusy,
  starDisabled,
  starError,
}: {
  restaurant: Restaurant;
  onNavigate: (path: string) => void;
  onToggleStar: (restaurant: Restaurant) => void;
  starBusy: boolean;
  starDisabled: boolean;
  starError: string;
}) {
  const starErrorId = `star-error-${restaurant.id}`;

  return (
    <article className="restaurant-card">
      <JournalLink
        href={`/restaurants/${restaurant.id}`}
        onNavigate={onNavigate}
        className="restaurant-card-link"
      >
        <span className="card-index" aria-hidden="true">{String(restaurant.id).padStart(2, "0")}</span>
        <span className="card-body">
          <span className="card-cuisine">{restaurant.cuisineName}</span>
          <span className="card-name">{restaurant.name}</span>
          <span className="card-location">{restaurant.city || "A place to remember"}</span>
          {restaurant.notes && <span className="card-note">{restaurant.notes}</span>}
        </span>
        <span className="card-aside">
          <Rating rating={restaurant.rating} />
          <span className="card-arrow" aria-hidden="true">↗</span>
        </span>
      </JournalLink>
      <div className="card-star-action">
        <StarToggleButton
          className="star-toggle"
          restaurant={restaurant}
          busy={starBusy}
          disabled={starDisabled}
          describedBy={starError ? starErrorId : undefined}
          onToggle={() => onToggleStar(restaurant)}
        />
        {starError && <p className="star-action-error" id={starErrorId} role="alert">{starError}</p>}
      </div>
    </article>
  );
}

function RestaurantForm({
  csrfToken,
  onNavigate,
  restaurantId,
}: {
  csrfToken: string;
  onNavigate: (path: string) => void;
  restaurantId?: number;
}) {
  const isEditing = restaurantId !== undefined;
  const [cuisines, setCuisines] = useState<Cuisine[]>([]);
  const [cuisinesLoading, setCuisinesLoading] = useState(true);
  const [cuisineError, setCuisineError] = useState("");
  const [restaurantLoading, setRestaurantLoading] = useState(isEditing);
  const [restaurantLoadError, setRestaurantLoadError] = useState("");
  const [restaurantRetry, setRestaurantRetry] = useState(0);
  const [name, setName] = useState("");
  const [cuisineId, setCuisineId] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");
  const [rating, setRating] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [focusFirstError, setFocusFirstError] = useState(false);
  const fieldRefs = {
    name: useRef<HTMLInputElement>(null),
    cuisineId: useRef<HTMLSelectElement>(null),
    city: useRef<HTMLInputElement>(null),
    rating: useRef<HTMLInputElement>(null),
    notes: useRef<HTMLTextAreaElement>(null),
  };

  async function loadCuisines() {
    setCuisinesLoading(true);
    setCuisineError("");
    try {
      setCuisines(await fetchCuisines());
    } catch {
      setCuisineError("We couldn’t bring in the cuisine list. Try again in a moment.");
    } finally {
      setCuisinesLoading(false);
    }
  }

  useEffect(() => {
    void loadCuisines();
  }, []);

  useEffect(() => {
    if (restaurantId === undefined) return;
    let active = true;
    setRestaurantLoading(true);
    setRestaurantLoadError("");

    fetchRestaurant(restaurantId)
      .then((restaurant) => {
        if (!active) return;
        setName(restaurant.name);
        setCuisineId(String(restaurant.cuisineId));
        setCity(restaurant.city ?? "");
        setNotes(restaurant.notes ?? "");
        setRating(restaurant.rating === null ? "" : String(restaurant.rating));
      })
      .catch((error: unknown) => {
        if (!active) return;
        setRestaurantLoadError(
          error instanceof ApiError && error.status === 404
            ? "We couldn’t find that place in your journal."
            : "The saved details couldn’t be loaded. Please try again.",
        );
      })
      .finally(() => {
        if (active) setRestaurantLoading(false);
      });

    return () => {
      active = false;
    };
  }, [restaurantId, restaurantRetry]);

  useEffect(() => {
    if (!focusFirstError) return;
    const firstField = ["name", "cuisineId", "city", "rating", "notes"].find(
      (field) => Boolean(errors[field]),
    );
    if (firstField) fieldRefs[firstField as keyof typeof fieldRefs].current?.focus();
    setFocusFirstError(false);
  }, [errors, focusFirstError]);

  function clearFieldError(field: string) {
    setErrors((current) => ({ ...current, [field]: "" }));
    setFormError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const ratingResult = restaurantRatingInputSchema.safeParse(rating);
    const parsed = restaurantInputSchema.safeParse({
      name,
      cuisineId: cuisineId ? Number(cuisineId) : undefined,
      city: city.trim() || null,
      notes: notes.trim() || null,
      rating: ratingResult.success ? ratingResult.data : null,
    });
    const nextErrors: Record<string, string> = {};
    if (!ratingResult.success) {
      nextErrors.rating = ratingResult.error.issues[0]?.message ?? "Enter a valid rating.";
    }
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string" && !nextErrors[field]) {
          nextErrors[field] = issue.message;
        }
      }
    }
    setErrors(nextErrors);
    const hasErrors = Object.keys(nextErrors).length > 0;
    setFormError(hasErrors ? "Please correct the highlighted fields." : "");
    setFocusFirstError(hasErrors);
    if (hasErrors || !parsed.success || !ratingResult.success) return;
    if (!csrfToken) {
      setFormError("Your secure session is not ready. Refresh the page and try again.");
      return;
    }
    setSaving(true);
    try {
      const input: CreateRestaurantInput = {
        name: parsed.data.name,
        cuisineId: parsed.data.cuisineId,
        city: parsed.data.city ?? null,
        notes: parsed.data.notes ?? null,
        rating: parsed.data.rating ?? null,
      };
      const saved = isEditing
        ? await updateRestaurant(restaurantId, input, csrfToken)
        : await createRestaurant(input, csrfToken);
      onNavigate(`/restaurants/${saved.id}`);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.errors);
        setFormError(error.message);
        setFocusFirstError(Object.keys(error.errors).length > 0);
      } else {
        setFormError("We couldn’t save this place. Check your connection and try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  if (restaurantLoading) {
    return (
      <section className="journal-content form-content" aria-busy="true" aria-live="polite">
        <JournalLink className="back-link" href="/" onNavigate={onNavigate}>← Your collection</JournalLink>
        <p>Loading your saved details…</p>
      </section>
    );
  }

  if (restaurantLoadError) {
    return (
      <section className="journal-content form-content" aria-labelledby="edit-load-heading">
        <JournalLink className="back-link" href="/" onNavigate={onNavigate}>← Your collection</JournalLink>
        <div className="journal-state error-state" role="alert">
          <span className="state-stamp" aria-hidden="true">!</span>
          <h1 id="edit-load-heading">This place isn’t available.</h1>
          <p>{restaurantLoadError}</p>
          <button
            className="journal-secondary-button"
            type="button"
            onClick={() => setRestaurantRetry((retry) => retry + 1)}
          >
            Try again
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="journal-content form-content" aria-labelledby="add-heading">
      <JournalLink className="back-link" href="/" onNavigate={onNavigate}>← Your collection</JournalLink>
      <p className="journal-eyebrow">{isEditing ? "Update your journal" : "A new page in your journal"}</p>
      <h1 id="add-heading">{isEditing ? "Edit this place." : "Save a place."}</h1>
      <p className="journal-lede">
        {isEditing
          ? "Keep the details current, just as you remember them."
          : "Keep the details that make this one worth finding again."}
      </p>

      <form className="restaurant-form" onSubmit={handleSubmit} noValidate>
        <div className="journal-field">
          <label htmlFor="restaurant-name">Restaurant name <span>Required</span></label>
          <input
            id="restaurant-name"
            name="name"
            autoComplete="organization"
            maxLength={RESTAURANT_LIMITS.nameCharacters}
            ref={fieldRefs.name}
            placeholder="The name on the door"
            value={name}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "restaurant-name-error" : undefined}
            onChange={(event) => {
              setName(event.target.value);
              clearFieldError("name");
            }}
            required
          />
          {errors.name && <p className="journal-field-error" id="restaurant-name-error">{errors.name}</p>}
        </div>

        <div className="journal-field">
          <label htmlFor="restaurant-cuisine">Cuisine <span>Required</span></label>
          {cuisinesLoading ? (
            <div className="select-skeleton" aria-label="Loading cuisines" />
          ) : cuisineError ? (
            <div className="inline-error" role="alert">
              <p>{cuisineError}</p>
              <button type="button" className="inline-retry" onClick={() => void loadCuisines()}>Try again</button>
            </div>
          ) : cuisines.length === 0 ? (
            <p className="inline-error" role="status">No cuisines are available right now.</p>
          ) : (
            <select
              id="restaurant-cuisine"
              name="cuisineId"
              ref={fieldRefs.cuisineId}
              value={cuisineId}
              aria-invalid={Boolean(errors.cuisineId)}
              aria-describedby={errors.cuisineId ? "restaurant-cuisine-error" : undefined}
              onChange={(event) => {
                setCuisineId(event.target.value);
                clearFieldError("cuisineId");
              }}
              required
            >
              <option value="">Choose a cuisine</option>
              {cuisines.map((cuisine) => <option key={cuisine.id} value={cuisine.id}>{cuisine.name}</option>)}
            </select>
          )}
          {errors.cuisineId && <p className="journal-field-error" id="restaurant-cuisine-error">{errors.cuisineId}</p>}
        </div>

        <div className="journal-field">
          <label htmlFor="restaurant-city">City <span>Optional</span></label>
          <input
            id="restaurant-city"
            name="city"
            autoComplete="address-level2"
            maxLength={RESTAURANT_LIMITS.cityCharacters}
            ref={fieldRefs.city}
            placeholder="Where you found it"
            value={city}
            aria-invalid={Boolean(errors.city)}
            aria-describedby={errors.city ? "restaurant-city-error" : undefined}
            onChange={(event) => {
              setCity(event.target.value);
              clearFieldError("city");
            }}
          />
          {errors.city && <p className="journal-field-error" id="restaurant-city-error">{errors.city}</p>}
        </div>

        <div className="journal-field">
          <label htmlFor="restaurant-rating">Your rating <span>Optional · 1.0–5.0</span></label>
          <input
            id="restaurant-rating"
            name="rating"
            type="number"
            inputMode="decimal"
            min="1"
            max="5"
            step="0.1"
            ref={fieldRefs.rating}
            placeholder="Leave blank if you’re not sure"
            value={rating}
            aria-invalid={Boolean(errors.rating)}
            aria-describedby={errors.rating ? "restaurant-rating-error" : "rating-hint"}
            onChange={(event) => {
              setRating(event.target.value);
              clearFieldError("rating");
            }}
          />
          {errors.rating
            ? <p className="journal-field-error" id="restaurant-rating-error">{errors.rating}</p>
            : <p className="field-hint" id="rating-hint">A personal note to yourself, not a scorecard.</p>}
        </div>

        <div className="journal-field">
          <label htmlFor="restaurant-notes">Notes <span>Optional</span></label>
          <textarea
            id="restaurant-notes"
            name="notes"
            maxLength={RESTAURANT_LIMITS.notesCharacters}
            rows={5}
            ref={fieldRefs.notes}
            placeholder="What would you like to remember?"
            value={notes}
            aria-invalid={Boolean(errors.notes)}
            aria-describedby={errors.notes ? "restaurant-notes-error" : undefined}
            onChange={(event) => {
              setNotes(event.target.value);
              clearFieldError("notes");
            }}
          />
          {errors.notes && <p className="journal-field-error" id="restaurant-notes-error">{errors.notes}</p>}
        </div>

        {formError && <p className="form-error" role="alert">{formError}</p>}
        <div className="form-actions">
          <button className="journal-submit" type="submit" disabled={saving || cuisinesLoading || Boolean(cuisineError) || cuisines.length === 0}>
            {saving
              ? isEditing ? "Saving your changes…" : "Saving your place…"
              : isEditing ? "Save changes" : "Add to my collection"}
            <span aria-hidden="true">↗</span>
          </button>
          <JournalLink
            className="cancel-link"
            href={isEditing && restaurantId !== undefined ? `/restaurants/${restaurantId}` : "/"}
            onNavigate={onNavigate}
          >
            Cancel
          </JournalLink>
        </div>
      </form>
    </section>
  );
}

function CollectionPage({
  csrfToken,
  onNavigate,
  starredOnly = false,
}: {
  csrfToken: string;
  onNavigate: (path: string) => void;
  starredOnly?: boolean;
}) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [starBusyId, setStarBusyId] = useState<number | null>(null);
  const [starError, setStarError] = useState<{ id: number; message: string } | null>(null);

  async function loadRestaurants() {
    setLoading(true);
    setError("");
    setStarError(null);
    try {
      setRestaurants(
        starredOnly ? await fetchStarredRestaurants() : await fetchRestaurants(),
      );
    } catch {
      setError(
        starredOnly
          ? "Your starred places couldn’t be reached just now. Please try again."
          : "Your collection couldn’t be reached just now. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function toggleStar(restaurant: Restaurant) {
    if (starBusyId !== null || !csrfToken) return;
    const nextState = !restaurant.isStarred;
    setStarBusyId(restaurant.id);
    setStarError(null);
    try {
      const isStarred = await setRestaurantStar(
        restaurant.id,
        nextState,
        csrfToken,
      );
      setRestaurants((current) => {
        if (starredOnly && !isStarred) {
          return current.filter((item) => item.id !== restaurant.id);
        }
        return current.map((item) =>
          item.id === restaurant.id ? { ...item, isStarred } : item,
        );
      });
    } catch (reason) {
      setStarError({
        id: restaurant.id,
        message:
          reason instanceof ApiError
            ? reason.message
            : "Your starred places couldn’t be updated. Check your connection and try again.",
      });
    } finally {
      setStarBusyId(null);
    }
  }

  useEffect(() => {
    void loadRestaurants();
  }, [starredOnly]);

  return (
    <section className="journal-content collection-content" aria-labelledby="collection-heading">
      <div className="collection-heading-row">
        <div>
          <p className="journal-eyebrow">{starredOnly ? "Your starred places" : "Your private restaurant journal"}</p>
          <h1 id="collection-heading">{starredOnly ? "The ones to return to." : "Places with a story."}</h1>
          <p className="journal-lede">
            {starredOnly
              ? "A small shortlist of places you want to keep close."
              : "A little record of the tables, tastes, and moments you want to keep."}
          </p>
        </div>
        <JournalLink className="add-place-button" href="/restaurants/new" onNavigate={onNavigate}>
          <span aria-hidden="true">+</span> Add a place
        </JournalLink>
      </div>

      {loading ? (
        <div className="restaurant-list" aria-label="Loading your collection" aria-busy="true">
          {[0, 1, 2].map((item) => <div className="restaurant-skeleton" key={item}><span /><div><i /><b /><i /></div></div>)}
        </div>
      ) : error ? (
        <div className="journal-state error-state" role="alert">
          <span className="state-stamp" aria-hidden="true">!</span>
          <h2>A small pause.</h2>
          <p>{error}</p>
          <button className="journal-secondary-button" type="button" onClick={() => void loadRestaurants()}>Try again</button>
        </div>
      ) : restaurants.length === 0 && starredOnly ? (
        <div className="journal-state empty-state">
          <span className="empty-illustration" aria-hidden="true"><i /><b /></span>
          <p className="journal-eyebrow">Nothing starred yet</p>
          <h2>Your shortlist starts with a star.</h2>
          <p>Star a place from your collection or its detail page, and it will be easy to find here.</p>
          <JournalLink className="add-place-button" href="/" onNavigate={onNavigate}>Browse your collection <span aria-hidden="true">↗</span></JournalLink>
        </div>
      ) : restaurants.length === 0 ? (
        <div className="journal-state empty-state">
          <span className="empty-illustration" aria-hidden="true"><i /><b /></span>
          <p className="journal-eyebrow">Nothing saved yet</p>
          <h2>Every good list starts somewhere.</h2>
          <p>Add the place you’re still thinking about. The one with the perfect dumplings, the window seat, or the kind stranger who brought dessert.</p>
          <JournalLink className="add-place-button" href="/restaurants/new" onNavigate={onNavigate}>Save your first place <span aria-hidden="true">↗</span></JournalLink>
        </div>
      ) : (
        <>
          <div className="collection-meta">
            <span>
              {restaurants.length}{" "}
              {starredOnly
                ? restaurants.length === 1 ? "place starred" : "places starred"
                : restaurants.length === 1 ? "place kept" : "places kept"}
            </span>
            <span>{starredOnly ? "YOUR SHORTLIST" : "PRIVATE BY DESIGN"}</span>
          </div>
          <div className="restaurant-list">
            {restaurants.map((restaurant) => (
              <RestaurantCard
                key={restaurant.id}
                restaurant={restaurant}
                onNavigate={onNavigate}
                onToggleStar={toggleStar}
                starBusy={starBusyId === restaurant.id}
                starDisabled={starBusyId !== null || !csrfToken}
                starError={starError?.id === restaurant.id ? starError.message : ""}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function DetailPage({
  id,
  csrfToken,
  onNavigate,
}: {
  id: number;
  csrfToken: string;
  onNavigate: (path: string) => void;
}) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [starBusy, setStarBusy] = useState(false);
  const [starError, setStarError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setRestaurant(null);
    setConfirmingDelete(false);
    setDeleteError("");
    fetchRestaurant(id).then((result) => {
      if (active) setRestaurant(result);
    }).catch((reason: unknown) => {
      if (!active) return;
      setError(reason instanceof ApiError && reason.status === 404
        ? "We couldn’t find that place in your journal."
        : "This page couldn’t be reached just now. Please try again.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [id]);

  async function handleDelete() {
    if (!restaurant || !csrfToken || deleting) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteRestaurant(restaurant.id, csrfToken);
      onNavigate("/");
    } catch (reason) {
      setDeleteError(
        reason instanceof ApiError
          ? reason.message
          : "This place couldn’t be deleted. Check your connection and try again.",
      );
    } finally {
      setDeleting(false);
    }
  }

  async function toggleStar() {
    if (!restaurant || !csrfToken || starBusy) return;
    setStarBusy(true);
    setStarError("");
    try {
      const isStarred = await setRestaurantStar(
        restaurant.id,
        !restaurant.isStarred,
        csrfToken,
      );
      setRestaurant((current) =>
        current ? { ...current, isStarred } : current,
      );
    } catch (reason) {
      setStarError(
        reason instanceof ApiError
          ? reason.message
          : "Your starred places couldn’t be updated. Check your connection and try again.",
      );
    } finally {
      setStarBusy(false);
    }
  }

  if (loading) {
    return <section className="journal-content detail-content" aria-busy="true" aria-label="Loading restaurant"><div className="detail-skeleton" /></section>;
  }
  if (error || !restaurant) {
    return (
      <section className="journal-content detail-content">
        <JournalLink className="back-link" href="/" onNavigate={onNavigate}>← Your collection</JournalLink>
        <div className="journal-state error-state" role="alert">
          <span className="state-stamp" aria-hidden="true">!</span>
          <h1>Not quite the page we hoped for.</h1>
          <p>{error || "This place isn’t available."}</p>
          <JournalLink className="add-place-button" href="/" onNavigate={onNavigate}>Back to your collection</JournalLink>
        </div>
      </section>
    );
  }

  return (
    <article className="journal-content detail-content" aria-labelledby="detail-heading">
      <JournalLink className="back-link" href="/" onNavigate={onNavigate}>← Your collection</JournalLink>
      <div className="detail-topline">
        <span className="detail-cuisine">{restaurant.cuisineName}</span>
        <span className="detail-date">SAVED {formatDate(restaurant.createdAt)}</span>
      </div>
      <h1 id="detail-heading">{restaurant.name}</h1>
      <p className="detail-location">{restaurant.city || "A place without a pin, remembered all the same."}</p>

      <div className="detail-paper">
        <div className="detail-facts">
          <div>
            <span className="fact-label">Cuisine</span>
            <span className="fact-value">{restaurant.cuisineName}</span>
          </div>
          <div>
            <span className="fact-label">City</span>
            <span className="fact-value">{restaurant.city || "Not noted"}</span>
          </div>
          <div>
            <span className="fact-label">Your rating</span>
            <span className="fact-value"><Rating rating={restaurant.rating} /></span>
          </div>
        </div>
        <div className="detail-notes">
          <span className="fact-label">A note to remember</span>
          {restaurant.notes
            ? <p>{restaurant.notes}</p>
            : <p className="notes-empty">No note for this one. Maybe the feeling is enough.</p>}
        </div>
      </div>
      <div className="detail-actions">
        <JournalLink
          className="detail-edit-button"
          href={`/restaurants/${restaurant.id}/edit`}
          onNavigate={onNavigate}
        >
          Edit details
        </JournalLink>
        <StarToggleButton
          className="detail-star-button"
          restaurant={restaurant}
          busy={starBusy}
          disabled={!csrfToken}
          describedBy={starError ? "detail-star-error" : undefined}
          onToggle={() => void toggleStar()}
        />
        <button
          className="detail-delete-button"
          type="button"
          onClick={() => {
            setDeleteError("");
            setConfirmingDelete(true);
          }}
        >
          Delete restaurant
        </button>
      </div>
      {starError && <p className="star-action-error detail-star-error" id="detail-star-error" role="alert">{starError}</p>}
      {confirmingDelete && (
        <div
          className="delete-confirmation"
          role="alertdialog"
          aria-labelledby="delete-confirmation-heading"
          aria-describedby="delete-confirmation-description"
        >
          <h2 id="delete-confirmation-heading">
            Are you sure you want to delete {restaurant.name}?
          </h2>
          <p id="delete-confirmation-description">
            This removes the restaurant from your collection and cannot be undone.
          </p>
          {deleteError && <p className="form-error" role="alert">{deleteError}</p>}
          <div className="delete-confirmation-actions">
            <button
              className="journal-secondary-button"
              type="button"
              autoFocus
              disabled={deleting}
              onClick={() => setConfirmingDelete(false)}
            >
              Cancel
            </button>
            <button
              className="confirm-delete-button"
              type="button"
              disabled={deleting}
              onClick={() => void handleDelete()}
            >
              {deleting ? "Deleting…" : "Delete restaurant"}
            </button>
          </div>
        </div>
      )}
      <p className="detail-signoff">Kept for a day when you want to go back.</p>
    </article>
  );
}

export default function RestaurantJournal({
  csrfToken,
  onLogout,
  loggingOut,
  logoutError,
}: {
  csrfToken: string;
  onLogout: () => void;
  loggingOut: boolean;
  logoutError: string;
}) {
  const [path, setPath] = useState(() => window.location.pathname);
  const route = routeFor(path);

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function navigate(nextPath: string) {
    if (window.location.pathname !== nextPath) window.history.pushState({}, "", nextPath);
    setPath(nextPath);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main className="journal-shell">
      <header className="journal-header">
        <Brand />
        <nav className="journal-nav" aria-label="Main navigation">
          <JournalLink className={route.page === "collection" || route.page === "detail" || route.page === "edit" ? "nav-current" : ""} href="/" onNavigate={navigate}>My collection</JournalLink>
          <JournalLink className={`journal-nav-starred${route.page === "starred" ? " nav-current" : ""}`} href="/restaurants/starred" onNavigate={navigate}>Starred</JournalLink>
          <JournalLink className="nav-add" href="/restaurants/new" onNavigate={navigate}>Add a place <span aria-hidden="true">+</span></JournalLink>
          <button className="logout-button" type="button" onClick={onLogout} disabled={loggingOut}>
            {loggingOut ? "Signing out…" : "Log out"}
          </button>
        </nav>
      </header>
      {logoutError && <p className="journal-logout-error" role="alert">{logoutError}</p>}
      {route.page === "collection" && <CollectionPage csrfToken={csrfToken} onNavigate={navigate} />}
      {route.page === "starred" && <CollectionPage csrfToken={csrfToken} onNavigate={navigate} starredOnly />}
      {route.page === "new" && <RestaurantForm csrfToken={csrfToken} onNavigate={navigate} />}
      {route.page === "edit" && <RestaurantForm csrfToken={csrfToken} onNavigate={navigate} restaurantId={route.id} />}
      {route.page === "detail" && <DetailPage id={route.id} csrfToken={csrfToken} onNavigate={navigate} />}
      {route.page === "not-found" && (
        <section className="journal-content journal-state error-state" aria-labelledby="route-error-heading">
          <span className="state-stamp" aria-hidden="true">!</span>
          <h1 id="route-error-heading">This page took a wrong turn.</h1>
          <p>That address doesn’t match a page in your journal.</p>
          <JournalLink className="add-place-button" href="/" onNavigate={navigate}>Return to your collection</JournalLink>
        </section>
      )}
      <footer className="journal-footer">
        <span>BITEBUDDY PERSONAL</span>
        <span>A private place for the places you love.</span>
      </footer>
    </main>
  );
}
