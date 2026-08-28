import { Outlet } from "react-router-dom";
import ArticleSearch from "../components/ArticleSearch/ArticleSearch";
import BannerContainer from "../components/BannerContainer";
import ContainerRow from "../components/ContainerRow";
import FeedToggler from "../components/FeedToggler";
import FollowTagButton from "../components/FollowTagButton/FollowTagButton";
import RecentlyViewed from "../components/RecentlyViewed";
import TagFilterInput from "../components/TagFilterInput/TagFilterInput";
import { useAuth } from "../context/AuthContext";
import FeedProvider from "../context/FeedContext";
import PopularTags from "./../components/PopularTags";

function Home() {
  const { isAuth } = useAuth();

  return (
    <div className="home-page">
      {!isAuth && (
        <BannerContainer>
          <h1 className="logo-font">conduit</h1>
          <p>A place to share your knowledge.</p>
        </BannerContainer>
      )}
      <ContainerRow type="page">
        <FeedProvider>
          <div className="col-md-9">
            <ArticleSearch />
            <TagFilterInput />
            <FollowTagButton />
            <FeedToggler />
            <Outlet />
          </div>

          <aside className="col-md-3">
            <PopularTags />
            <RecentlyViewed />
          </aside>
        </FeedProvider>
      </ContainerRow>
    </div>
  );
}

export default Home;
