import ReactPaginate from "react-paginate";
import getUsers from "../../services/getUsers";

function UsersPagination({ updateUsers, usersCount }) {
  const totalPages = Math.ceil(usersCount / 3);

  const handlePageChange = ({ selected: page }) => {
    getUsers({ page }).then(updateUsers).catch(console.error);
  };

  return (
    <ReactPaginate
      activeClassName="active"
      breakClassName="page-item"
      breakLabel="..."
      breakLinkClassName="page-link"
      containerClassName="pagination pagination-sm"
      nextClassName="page-item"
      nextLabel={<i className="ion-arrow-right-b"></i>}
      nextLinkClassName="page-link"
      onPageChange={handlePageChange}
      pageClassName="page-item"
      pageCount={totalPages}
      pageLinkClassName="page-link"
      previousClassName="page-item"
      previousLabel={<i className="ion-arrow-left-b"></i>}
      previousLinkClassName="page-link"
      renderOnZeroPageCount={null}
    />
  );
}

export default UsersPagination;
