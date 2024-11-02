// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDgZiyREc7W3NKQDFQpIgPowATrbRkEGLI",
    authDomain: "library-31c26.firebaseapp.com",
    projectId: "library-31c26",
    storageBucket: "library-31c26.appspot.com",
    messagingSenderId: "466784027762",
    appId: "1:466784027762:web:fc3de7d408fc5d4fe72eeb",
    measurementId: "G-V2YPX8VQQQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Sign in function
function signIn() {
    signInWithPopup(auth, provider)
        .then((result) => {
            // Signed in
            $("#sign-in-button").hide();
            $("#sign-out-button").show();
        }).catch((error) => {
            console.error("Error signing in: ", error);
        });
}

// Sign out function
function signOutUser() {
    signOut(auth).then(() => {
        $("#sign-in-button").show();
        $("#sign-out-button").hide();
    }).catch((error) => {
        console.error("Error signing out: ", error);
    });
}

// Check auth state
onAuthStateChanged(auth, (user) => {
    if (user) {
        $("#sign-in-button").hide();
        $("#sign-out-button").show();
    } else {
        $("#sign-in-button").show();
        $("#sign-out-button").hide();
    }
});

// Search books using Google Books API
export function searchBooks(offset = 0, results = []) {
    let titleQuery = $("#search-title").val();
    let authorQuery = $("#search-author").val();
    let languages = [];
    if ($("#english").is(":checked")) languages.push("en");
    if ($("#dutch").is(":checked")) languages.push("nl");

    let query = "";
    if (titleQuery) query += `${titleQuery}`;
    if (authorQuery) query += `${titleQuery ? '+' : ''}inauthor:${authorQuery}`;
    if (languages.length > 0) query += `&langRestrict=${languages.join(",")}`;
    query += `&startIndex=${offset}`;
    query += "&maxResults=40";

    let fields = "items(id,volumeInfo(title,authors,pageCount,description,imageLinks,previewLink))";

    $.get(`https://www.googleapis.com/books/v1/volumes?q=${query}&fields=${fields}`, function (data) {
        if (data.items) {
            displaySearchResults(data.items);
        }
    });
}

// Display search results
async function displaySearchResults(books) {
    let searchResults = $("#search-results");
    searchResults.empty();

    // Fetch existing books from Firestore
    const libraryBooks = await getCollectionBooks("library");
    const wishlistBooks = await getCollectionBooks("wishlist");

    books.forEach(book => {
        let bookInfo = book.volumeInfo;
        let id = book.id;
        let link = book.selfLink;
        let pages = bookInfo.pageCount ? `${bookInfo.pageCount} pages` : "Unknown pages";
        let description = bookInfo.description ? bookInfo.description : "No description available";
        let thumbnail = bookInfo.imageLinks ? bookInfo.imageLinks.thumbnail : 'https://via.placeholder.com/128x192.png?text=No+Image';
        if (bookInfo.imageLinks.large) {
            thumbnail = bookInfo.imageLinks.large;
        }

        // Store book information in session storage
        sessionStorage.setItem(id, JSON.stringify(book));

        let libraryText = libraryBooks.includes(id) ? 'Already in Library' : `<button class="btn btn-primary add-to-library" data-id="${id}" data-link="${link}">Add to Library</button>`;
        let wishlistText = wishlistBooks.includes(id) ? 'Already in Wishlist' : libraryBooks.includes(id) ? '' : `<button class="btn btn-secondary add-to-wishlist" data-id="${id}" data-link="${link}">Add to Wishlist</button>`;
        let bookHtml = `
      <div class="col-md-3">
        <div class="card mb-4">
          <img src="${thumbnail}" class="card-img-top" alt="${bookInfo.title}">
          <div class="card-body">
            <h5 class="card-title">${bookInfo.title}</h5>
            <p class="card-text">${bookInfo.authors ? bookInfo.authors.join(', ') : 'Unknown Author'}</p>
            <p class="card-text">${pages}</p>
            <button class="btn btn-info view-description" data-description="${description}">View Description</button>
            ${libraryText}
            ${wishlistText}
          </div>
        </div>
      </div>
    `;
        searchResults.append(bookHtml);
    });
}

// Fetch books from a Firestore collection
async function getCollectionBooks(collectionName) {
    const querySnapshot = await getDocs(collection(db, collectionName));
    let books = [];
    querySnapshot.forEach((doc) => {
        books.push(doc.data().id);
    });
    return books;
}

// Add book to Firestore collection
export async function addToCollection(collectionName, id, info) {
    const user = auth.currentUser;
    if (user) {
        try {
            await addDoc(collection(db, collectionName), info);
            // Nice pop-up bootstrap alert, that vanishes after 3 seconds
            let alert = `<div class="alert alert-success alert-dismissible fade show" role="alert">
		  Book added successfully!
		  <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
		  </div>`;
            $("#notification-container").prepend(alert);
            setTimeout(function () {
                $(".alert").alert('close');
            }, 3000);
            // remove the button from the search results
            $(`button[data-id="${id}"]`).closest(".card").find(".add-to-library").remove();
            $(`button[data-id="${id}"]`).closest(".card").find(".add-to-wishlist").remove();
        } catch (e) {
            console.error("Error adding document: ", e);
        }
    } else {
        let alert = `<div class="alert alert-danger alert-dismissible fade show" role="alert">
            Please sign in to add books!
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>`;
        $("#notification-container").prepend(alert);
        setTimeout(function () {
            $(".alert").alert('close');
        }, 3000);
    }
}

// Add event listener for description buttons
$(document).on("click", ".view-description", function () {
    let description = $(this).data("description");
    // inject as html, so that line breaks are displayed correctly
    $("#descriptionModalBody").html(description);
    $("#descriptionModal").modal('show');
});


// Sign in button click event
$("#sign-in-button").click(function () {
    signIn();
});

// Sign out button click event
$("#sign-out-button").click(function () {
    signOutUser();
});

// Fetch all books from Firebase and display them
export async function fetchAllBooksLibrary() {
    const querySnapshot = await getDocs(collection(db, "library"));
    let books = [];
    querySnapshot.forEach((doc) => {
        books.push(doc.data());
    });
    displayBooksLibrary(books);
}

// Display all books
export async function displayBooksLibrary(books) {
    let bookList = $("#book-list");
    bookList.empty();
    //console.log(inBooks);
    // Fetch book details and sort by author, then by title
    //let books = await Promise.all(inBooks.map(fetchBookDetails));
    //console.log(books);
    books.sort((a, b) => {
        let authorA = a.volumeInfo.authors ? a.volumeInfo.authors[0] : '';
        let authorB = b.volumeInfo.authors ? b.volumeInfo.authors[0] : '';
        if (authorA < authorB) return -1;
        if (authorA > authorB) return 1;
        return a.volumeInfo.title.localeCompare(b.volumeInfo.title);
    });

    // Display sorted books
    books.forEach(bookfull => {
        let book = bookfull.volumeInfo;
        let thumbnail = book.imageLinks ? book.imageLinks.thumbnail : 'https://via.placeholder.com/128x192.png?text=No+Image';
        thumbnail=thumbnail.replace("zoom=1", "zoom=2");
        if (book.imageLinks.large) {
            thumbnail = book.imageLinks.large;
        }
        if (!thumbnail.endsWith(".jpeg")) {
            thumbnail += ".jpeg";
        }
        let pages = book.pageCount ? `${book.pageCount} pages` : "Unknown pages";
        let authors = book.authors ? book.authors.join(', ') : 'Unknown Author';
        let description = book.description ? book.description : "No description available";
        // escaped symbols like <, >, etc. are not displayed correctly in the modal, unescape them
        description = decodeURI(description);
        let embeddable = book.previewLink ? true : false;
        let bookHtml = `
            <div class="col-md-3">
              <div class="card mb-4">
                <img src="${thumbnail}" class="card-img-top" alt="${book.title}">
                <div class="card-body">
                  <h5 class="card-title">${book.title}</h5>
                  <p class="card-text">${authors}</p>
                    <p class="card-text">${pages}</p>
                    <button class="btn btn-info view-description" data-description="${description}">View Description</button>
                    `
        if (embeddable) {
            bookHtml += `<button class="btn btn-success embeddable" data-id="${bookfull.id}">Read Book</button>`;
        }
        bookHtml += `
                </div>
              </div>
            </div>
          `;
        bookList.append(bookHtml);
    });
}

// Fetch book details from Google Books API
function fetchBookDetails(book) {
    //console.log(book);
    let link = `https://www.googleapis.com/books/v1/volumes/${book.id}`;
    if (book.link !== 'undefined') {
        link = book.link;
    }
    //console.log(link);
    return new Promise((resolve, reject) => {
        $.get(link, function (data) {
            if (data.volumeInfo) {
                resolve(data);
            } else {
                reject('No book found with link: ' + link);
            }
        });
    });
}


// Show embeddable books
$(document).on("click", ".embeddable", function () {
    $("#viewerModal").modal('show');
    var viewer = new google.books.DefaultViewer(document.getElementById('viewerCanvas'));
    let id = $(this).data("id");
    viewer.load(`${id}`);

});
