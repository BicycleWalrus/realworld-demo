import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import getArticle from "../../services/getArticle";
import setArticle from "../../services/setArticle";
import FormFieldset from "../FormFieldset";

const emptyForm = { title: "", description: "", body: "", image: "", tagList: "", draft: false };

function ArticleEditorForm() {
  const { state } = useLocation();
  const [{ title, description, body, image, tagList, draft }, setForm] = useState(
    state || emptyForm,
  );
  const [errorMessage, setErrorMessage] = useState("");
  const { isAuth, headers, loggedUser } = useAuth();

  const navigate = useNavigate();
  const { slug } = useParams();

  useEffect(() => {
    const redirect = () => navigate("/", { replace: true, state: null });
    if (!isAuth) return redirect();

    if (state || !slug) return;

    getArticle({ headers, slug })
      .then(({ author: { username }, body, description, image, tagList, title, draft }) => {
        if (username !== loggedUser.username) redirect();

        setForm({ body, description, image: image || "", tagList, title, draft: !!draft });
      })
      .catch(console.error);

    return () => setForm(emptyForm);
  }, [headers, isAuth, loggedUser.username, navigate, slug, state]);

  const inputHandler = (e) => {
    const type = e.target.name;
    const value = e.target.value;

    setForm((form) => ({ ...form, [type]: value }));
  };

  const tagsInputHandler = (e) => {
    const value = e.target.value;

    setForm((form) => ({ ...form, tagList: value.split(/,| /) }));
  };

  // Draft/publish workflow (REQ-067): saving always submits an explicit
  // draft flag — false publishes (create or draft publish), true keeps
  // or makes the article a draft.
  const save = (submitAsDraft) => (e) => {
    e.preventDefault();

    setArticle({ headers, slug, body, description, image, tagList, title, draft: submitAsDraft })
      .then((slug) => navigate(`/article/${slug}`))
      .catch(setErrorMessage);
  };

  return (
    <form onSubmit={save(false)}>
      <fieldset>
        {errorMessage && <span className="error-messages">{errorMessage}</span>}
        <FormFieldset
          placeholder="Article Title"
          name="title"
          required
          value={title}
          handler={inputHandler}
        ></FormFieldset>

        <FormFieldset
          normal
          placeholder="What's this article about?"
          name="description"
          required
          value={description}
          handler={inputHandler}
        ></FormFieldset>

        <FormFieldset
          normal
          placeholder="Cover image URL (optional)"
          name="image"
          type="url"
          value={image}
          handler={inputHandler}
        ></FormFieldset>

        <fieldset className="form-group">
          <textarea
            className="form-control"
            rows="8"
            placeholder="Write your article (in markdown)"
            name="body"
            required
            value={body}
            onChange={inputHandler}
          ></textarea>
        </fieldset>

        <FormFieldset
          normal
          placeholder="Enter tags"
          name="tags"
          value={tagList}
          handler={tagsInputHandler}
        >
          <div className="tag-list"></div>
        </FormFieldset>

        <button className="btn btn-lg pull-xs-right btn-primary" type="submit">
          {slug && !draft ? "Update Article" : "Publish Article"}
        </button>
        <button
          className="btn btn-lg pull-xs-right btn-outline-primary"
          onClick={save(true)}
          type="button"
        >
          Save Draft
        </button>
      </fieldset>
    </form>
  );
}

export default ArticleEditorForm;
