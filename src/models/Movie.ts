import mongoose, { Schema, models, model } from "mongoose";

const MovieSchema = new Schema({
  title: { type: String, required: true },
  poster: { type: String, default: "" },
  rating: { type: String, default: "" },
  price: { type: Number, default: 0 },
  link: { type: String, default: "" },
  provider: { type: String, default: "" },
});

const Movie = models.Movie || model("Movie", MovieSchema);

export default Movie;