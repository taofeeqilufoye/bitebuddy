import { useEffect, useState } from "react";
import type { FormEvent, MouseEvent, ReactNode } from "react";
import {
  ApiError,
  createRestaurant,
  deleteRestaurant,
  fetchCuisines,
  fetchRestaurant,
  fetchRestaurants,
  updateRestaurant,
} from "./api";
import type { Cuisine, Restaurant } from "./api";

type JournalRoute =
  | { page: "collection" }
  | { page: "new" }
  | { page: "edit"; id: number }
  | { page: "detail"; id: number }
  | { page: "not-found" };

function routeFor(path: string): JournalRoute {
  if (path === "/" || path === "") return { page: "collection" };
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

function RestaurantCard({ restaurant, onNavigate }: { restaurant: Restaurant; onNavigate: (path: string) => void }) {
  return (
    <JournalLink
      href={`/restaurants/${restaurant.id}`}
      onNavigate={onNavigate}
      className="restaurant-card"
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors.name = "Enter a restaurant name.";
    if (!cuisineId) nextErrors.cuisineId = "Choose a cuisine.";
    if (rating && (!Number.isFinite(Number(rating)) || Number(rating) < 1 || Number(rating) > 5 || !/^\d(?:\.\d)?$/.test(rating))) {
      nextErrors.rating = "Use a rating from 1.0 to 5.0, with up to one decimal place.";
    }
    setErrors(nextErrors);
    setFormError("");
    if (Object.keys(nextErrors).length > 0) return;
    if (!csrfToken) {
      setFormError("Your secure session is not ready. Refresh the page and try again.");
      return;
    }
    setSaving(true);
    try {
      const input = {
        name: name.trim(),
        cuisineId: Number(cuisineId),
        city: city.trim() || null,
        notes: notes.trim() || null,
        rating: rating ? Number(rating) : null,
      };
      const saved = isEditing
        ? await updateRestaurant(restaurantId, input, csrfToken)
        : await createRestaurant(input, csrfToken);
      onNavigate(`/restaurants/${saved.id}`);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.errors);
        setFormError(error.message);
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
            maxLength={200}
            placeholder="The name on the door"
            value={name}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "restaurant-name-error" : undefined}
            onChange={(event) => {
              setName(event.target.value);
              setErrors((current) => ({ ...current, name: "" }));
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
              value={cuisineId}
              aria-invalid={Boolean(errors.cuisineId)}
              aria-describedby={errors.cuisineId ? "restaurant-cuisine-error" : undefined}
              onChange={(event) => {
                setCuisineId(event.target.value);
                setErrors((current) => ({ ...current, cuisineId: "" }));
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
            maxLength={120}
            placeholder="Where you found it"
            value={city}
            aria-invalid={Boolean(errors.city)}
            aria-describedby={errors.city ? "restaurant-city-error" : undefined}
            onChange={(event) => setCity(event.target.value)}
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
            placeholder="Leave blank if you’re not sure"
            value={rating}
            aria-invalid={Boolean(errors.rating)}
            aria-describedby={errors.rating ? "restaurant-rating-error" : "rating-hint"}
            onChange={(event) => {
              setRating(event.target.value);
              setErrors((current) => ({ ...current, rating: "" }));
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
            maxLength={5000}
            rows={5}
            placeholder="What would you like to remember?"
            value={notes}
            aria-invalid={Boolean(errors.notes)}
            aria-describedby={errors.notes ? "restaurant-notes-error" : undefined}
            onChange={(event) => setNotes(event.target.value)}
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

function CollectionPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadRestaurants() {
    setLoading(true);
    setError("");
    try {
      setRestaurants(await fetchRestaurants());
    } catch {
      setError("Your collection couldn’t be reached just now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRestaurants();
  }, []);

  return (
    <section className="journal-content collection-content" aria-labelledby="collection-heading">
      <div className="collection-heading-row">
        <div>
          <p className="journal-eyebrow">Your private restaurant journal</p>
          <h1 id="collection-heading">Places with a story.</h1>
          <p className="journal-lede">A little record of the tables, tastes, and moments you want to keep.</p>
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
            <span>{restaurants.length} {restaurants.length === 1 ? "place" : "places"} kept</span>
            <span>PRIVATE BY DESIGN</span>
          </div>
          <div className="restaurant-list">
            {restaurants.map((restaurant) => <RestaurantCard key={restaurant.id} restaurant={restaurant} onNavigate={onNavigate} />)}
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
          <JournalLink className="nav-add" href="/restaurants/new" onNavigate={navigate}>Add a place <span aria-hidden="true">+</span></JournalLink>
          <button className="logout-button" type="button" onClick={onLogout} disabled={loggingOut}>
            {loggingOut ? "Signing out…" : "Log out"}
          </button>
        </nav>
      </header>
      {logoutError && <p className="journal-logout-error" role="alert">{logoutError}</p>}
      {route.page === "collection" && <CollectionPage onNavigate={navigate} />}
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
